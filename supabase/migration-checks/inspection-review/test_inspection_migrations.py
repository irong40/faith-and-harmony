"""Apply the inspection migrations to a throwaway local Postgres and check every rule.

Covers 20261013200906_inspection_runs_detections.sql and the review-token
migration (*_inspection_review_token.sql). Supabase pieces the migrations
depend on are stubbed to match the live definitions read on 2026-10-13
(has_role and update_updated_at_column are copied verbatim; auth.uid() reads
the JWT subject the way Supabase's does). pgserver ships PostgreSQL 16; the
live project runs 17, so this is a rules check, not a version check.

    python -m venv .venv && .venv/Scripts/pip install pgserver "psycopg[binary]"
    .venv/Scripts/python test_inspection_migrations.py      # exit 0 = all pass
"""
import sys
import tempfile
import uuid
from pathlib import Path

import pgserver
import psycopg

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"
MIGRATION = MIGRATIONS_DIR / "20261013200906_inspection_runs_detections.sql"
# Placeholder version until Task 5 applies it and renames it to the recorded one.
TOKEN_MIGRATION = next(MIGRATIONS_DIR.glob("*_inspection_review_token.sql"), None)

STUBS = """
create role anon nologin; create role authenticated nologin;
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
create schema auth;
grant usage on schema auth to anon, authenticated, service_role;
create function auth.uid() returns uuid language sql stable as
  $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create type public.app_role as enum ('admin', 'user', 'pilot');
create table public.user_roles (user_id uuid, role public.app_role);
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$function$;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;
create table public.drone_jobs (id uuid primary key, pilot_id uuid);
"""

RESULTS = []


def check(name, ok, detail=""):
    RESULTS.append((name, ok))
    print(f"{'PASS' if ok else 'FAIL'}  {name}{('  -- ' + detail) if detail and not ok else ''}")


def raises(conn, sql, params=None, match=None):
    try:
        with conn.transaction():
            conn.execute(sql, params)
    except psycopg.Error as e:
        return match is None or match in str(e), str(e).splitlines()[0]
    return False, "no error raised"


def new_run(conn, expected, job=None, status_key=None):
    rid = uuid.uuid4()
    conn.execute(
        """insert into public.inspection_runs (id, run_key, drone_job_id, profile,
           expected_detections, ortho_path, crs_wkt, gsd_m, documented_extent_geojson,
           documented_extent_m2, profile_settings, e1_summary, code_version)
           values (%s, %s, %s, 'canopy', %s, 'o.tif', 'EPSG:32618', 0.01, '{}', 1, '{}', '{}',
           'test')""", (rid, status_key or str(rid), job, expected))
    return rid


def add_det(conn, rid, key, **kw):
    cols = dict(run_id=rid, detection_key=key, label="tree", geometry_wkt="POLYGON EMPTY",
                geometry_geojson="{}", centroid_lat=36.8, centroid_lon=-76.3, area_m2=1.0)
    cols.update(kw)
    names = ", ".join(cols)
    marks = ", ".join(["%s"] * len(cols))
    conn.execute(f"insert into public.inspection_detections ({names}) values ({marks})",
                 list(cols.values()))


def token_checks(conn):
    """Review-token migration: pair CHECK, unique hash, rotation, single use."""
    cols = {r[0] for r in conn.execute(
        """select column_name from information_schema.columns
           where table_schema='public' and table_name='inspection_runs'""").fetchall()}
    check("token columns exist",
          {"review_token_hash", "review_token_expires_at", "review_email_sent_at"} <= cols)

    r = new_run(conn, 0)
    ok, msg = raises(conn, "update public.inspection_runs set review_token_hash=%s where id=%s",
                     ("a" * 64, r), "inspection_runs_token_pair")
    check("hash without expiry refused (CHECK)", ok, msg)
    ok, msg = raises(conn, """update public.inspection_runs
                     set review_token_expires_at=now() + interval '7 days' where id=%s""",
                     (r,), "inspection_runs_token_pair")
    check("expiry without hash refused (CHECK)", ok, msg)

    # Open review the way Sortie's open_review does: status + hash + expiry in one PATCH.
    conn.execute("""update public.inspection_runs set status='awaiting_review',
                    review_token_hash=%s, review_token_expires_at=now() + interval '7 days'
                    where id=%s""", ("a" * 64, r))
    st = conn.execute("select status, review_token_hash from public.inspection_runs where id=%s",
                      (r,)).fetchone()
    check("review opens with hash + expiry in one update", st == ("awaiting_review", "a" * 64))

    r_dup = new_run(conn, 0)
    ok, msg = raises(conn, """update public.inspection_runs set review_token_hash=%s,
                     review_token_expires_at=now() where id=%s""", ("a" * 64, r_dup),
                     "review_token_hash")
    check("duplicate hash on a second run refused (UNIQUE)", ok, msg)
    ok = "duplicate key" in msg or "unique" in msg.lower()
    check("  ...and the refusal is the unique violation", ok, msg)

    conn.execute("""update public.inspection_runs set review_token_hash=%s,
                    review_token_expires_at=now() + interval '7 days' where id=%s""",
                 ("b" * 64, r))
    h = conn.execute("select review_token_hash from public.inspection_runs where id=%s",
                     (r,)).fetchone()[0]
    check("rotating the hash while awaiting_review succeeds", h == "b" * 64)
    conn.execute("update public.inspection_runs set review_email_sent_at=now() where id=%s", (r,))
    check("marking the email sent while awaiting_review succeeds", True)

    conn.execute("""update public.inspection_runs set status='approved',
                    reviewed_by='dradamopierce@gmail.com (signed link)' where id=%s""", (r,))
    check("signed-link approval succeeds with token columns untouched", True)
    ok, msg = raises(conn, "update public.inspection_runs set review_token_hash=%s where id=%s",
                     ("c" * 64, r), "is closed")
    check("changing the hash after approved -> 'is closed'", ok, msg)
    ok, msg = raises(conn, """update public.inspection_runs set review_token_hash=null,
                     review_token_expires_at=null where id=%s""", (r,), "is closed")
    check("clearing the token after approved -> 'is closed'", ok, msg)
    ok, msg = raises(conn, """update public.inspection_runs
                     set review_token_expires_at=now() + interval '30 days' where id=%s""",
                     (r,), "is closed")
    check("extending the expiry after approved -> 'is closed'", ok, msg)
    ok, msg = raises(conn, "update public.inspection_runs set review_email_sent_at=now() where id=%s",
                     (r,), "is closed")
    check("re-marking the email after approved -> 'is closed'", ok, msg)
    ok, msg = raises(conn, """update public.inspection_runs set status='rejected',
                     reviewed_by='x' where id=%s""", (r,), "not an allowed transition")
    check("second decision on an approved run refused", ok, msg)

    rr = new_run(conn, 0)
    conn.execute("""update public.inspection_runs set status='awaiting_review',
                    review_token_hash=%s, review_token_expires_at=now() + interval '7 days'
                    where id=%s""", ("d" * 64, rr))
    conn.execute("""update public.inspection_runs set status='rejected',
                    reviewed_by='dradamopierce@gmail.com (signed link)' where id=%s""", (rr,))
    ok, msg = raises(conn, "update public.inspection_runs set review_token_hash=%s where id=%s",
                     ("e" * 64, rr), "is closed")
    check("changing the hash after rejected -> 'is closed'", ok, msg)
    conn.execute("delete from public.inspection_runs where id in (%s, %s, %s)", (r, r_dup, rr))


def main():
    tmp = tempfile.mkdtemp(prefix="pg_inspection_")
    srv = pgserver.get_server(tmp, cleanup_mode="delete")
    with psycopg.connect(srv.get_uri(), autocommit=True) as conn:
        conn.execute(STUBS)
        sql = MIGRATION.read_text(encoding="utf-8")
        conn.execute(sql)
        conn.execute(sql)
        check("migration applies, and applies again (idempotent)", True)
        if TOKEN_MIGRATION is None:
            check("review-token migration file exists", False, "no *_inspection_review_token.sql")
            print(f"\n{sum(ok for _, ok in RESULTS)}/{len(RESULTS)} passed")
            sys.exit(1)
        tsql = TOKEN_MIGRATION.read_text(encoding="utf-8")
        conn.execute(tsql)
        conn.execute(tsql)
        check(f"{TOKEN_MIGRATION.name} applies, and applies again (idempotent)", True)
        token_checks(conn)

        # Upload: batches upsert idempotently on (run_id, detection_key).
        rid = new_run(conn, 3)
        for k in ("a", "b"):
            add_det(conn, rid, k)
        conn.execute("""insert into public.inspection_detections (run_id, detection_key, label,
            geometry_wkt, geometry_geojson, centroid_lat, centroid_lon, area_m2)
            values (%s, 'a', 'tree2', 'POLYGON EMPTY', '{}', 36.8, -76.3, 2.0)
            on conflict (run_id, detection_key) do update set label = excluded.label""", (rid,))
        n = conn.execute("select count(*) from public.inspection_detections where run_id=%s",
                         (rid,)).fetchone()[0]
        check("re-sent batch upserts instead of duplicating", n == 2)

        ok, msg = raises(conn, "update public.inspection_runs set status='awaiting_review' where id=%s",
                         (rid,), "2 of 3 detections")
        check("review cannot open on a partial upload", ok, msg)
        add_det(conn, rid, "c")
        conn.execute("update public.inspection_runs set status='awaiting_review' where id=%s", (rid,))
        req = conn.execute("select review_requested_at from public.inspection_runs where id=%s",
                           (rid,)).fetchone()[0]
        check("review opens once every detection has arrived", req is not None)

        ok, msg = raises(conn, "update public.inspection_detections set area_m2=9 where run_id=%s",
                         (rid,), "cannot be changed")
        check("detections frozen during review", ok, msg)
        ok, msg = raises(conn, "delete from public.inspection_detections where run_id=%s",
                         (rid,), "cannot be removed")
        check("detections cannot be deleted during review", ok, msg)
        ok, msg = raises(conn, """insert into public.inspection_detections (run_id, detection_key,
            label, geometry_wkt, geometry_geojson, centroid_lat, centroid_lon, area_m2)
            values (%s, 'late', 't', 'POLYGON EMPTY', '{}', 0, 0, 0)""", (rid,), "cannot be added")
        check("no detections added during review", ok, msg)
        conn.execute("""update public.inspection_detections set operator_verdict='rejected',
                        operator_note='car, not a tree' where run_id=%s and detection_key='a'""",
                     (rid,))
        check("operator verdict allowed during review", True)

        ok, msg = raises(conn, "update public.inspection_runs set status='approved' where id=%s",
                         (rid,), "needs reviewed_by")
        check("approval needs an approver", ok, msg)
        conn.execute("""update public.inspection_runs set status='approved', reviewed_by='adam'
                        where id=%s""", (rid,))
        at = conn.execute("select reviewed_at from public.inspection_runs where id=%s",
                          (rid,)).fetchone()[0]
        check("approval stamps reviewed_at", at is not None)

        ok, msg = raises(conn, "update public.inspection_runs set status='rejected' where id=%s",
                         (rid,), "not an allowed transition")
        check("approved run cannot change status", ok, msg)
        ok, msg = raises(conn, "update public.inspection_runs set outputs='{}' where id=%s",
                         (rid,), "is closed")
        check("approved run's record cannot change", ok, msg)
        conn.execute("update public.inspection_runs set review_notes='seen' where id=%s", (rid,))
        check("a note can still be added to an approved run", True)
        ok, msg = raises(conn, """update public.inspection_detections set operator_verdict='confirmed'
                         where run_id=%s""", (rid,), "cannot be changed")
        check("verdicts frozen after approval", ok, msg)

        r2 = new_run(conn, 0)
        ok, msg = raises(conn, """update public.inspection_runs set status='approved',
                         reviewed_by='adam' where id=%s""", (r2,), "not an allowed transition")
        check("cannot skip review: uploading -> approved refused", ok, msg)
        conn.execute("update public.inspection_runs set status='failed' where id=%s", (r2,))
        conn.execute("update public.inspection_runs set status='uploading' where id=%s", (r2,))
        check("failed run can restart upload", True)

        ok, msg = raises(conn, "update public.inspection_runs set reviewed_at=now() where id=%s",
                         (r2,), "inspection_runs_review_complete")
        check("review stamps only on a reviewed run", ok, msg)
        ok, msg = raises(conn, "update public.inspection_runs set reviewed_by='x' where id=%s",
                         (r2,), "inspection_runs_review_complete")
        check("no approver on an unreviewed run", ok, msg)

        r3 = new_run(conn, 1)
        ok, msg = raises(conn, """insert into public.inspection_detections (run_id, detection_key,
            label, geometry_wkt, geometry_geojson, centroid_lat, centroid_lon, area_m2, e3_status,
            e3_reason, outlier) values (%s, 'x', 't', 'P', '{}', 0, 0, 0, 'unscored',
            'mostly_masked', true)""", (r3,), "outlier_scored")
        check("an unscored detection cannot be an outlier", ok, msg)
        ok, msg = raises(conn, """insert into public.inspection_detections (run_id, detection_key,
            label, geometry_wkt, geometry_geojson, centroid_lat, centroid_lon, area_m2, e3_status)
            values (%s, 'y', 't', 'P', '{}', 0, 0, 0, 'unscored')""", (r3,), "reason")
        check("an unscored detection must say why", ok, msg)
        ok, msg = raises(conn, """insert into public.inspection_detections (run_id, detection_key,
            label, geometry_wkt, geometry_geojson, centroid_lat, centroid_lon, area_m2)
            values (%s, 'z', 't', 'P', '{}', 120, 0, 0)""", (r3,), "centroid_lat")
        check("latitude out of range refused", ok, msg)

        conn.execute("delete from public.inspection_runs where id=%s", (rid,))
        left = conn.execute("select count(*) from public.inspection_detections where run_id=%s",
                            (rid,)).fetchone()[0]
        check("deleting a run cascades to its detections (even approved)", left == 0)

        # RLS
        pilot, other, admin = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
        job = uuid.uuid4()
        conn.execute("insert into public.drone_jobs values (%s, %s)", (job, pilot))
        conn.execute("insert into public.user_roles values (%s, 'admin')", (admin,))
        rj = new_run(conn, 1, job=job)
        add_det(conn, rj, "k")

        def visible(role, sub):
            with conn.transaction():
                conn.execute(f"set local role {role}")
                if sub:
                    conn.execute("select set_config('request.jwt.claim.sub', %s, true)", (str(sub),))
                runs = conn.execute("select count(*) from public.inspection_runs").fetchone()[0]
                dets = conn.execute("select count(*) from public.inspection_detections").fetchone()[0]
            return runs, dets

        ok, msg = raises(conn, "set role anon; select * from public.inspection_runs",
                         None, "permission denied")
        conn.execute("reset role")
        check("anon has no access", ok, msg)
        check("pilot sees own job's run and detections", visible("authenticated", pilot) == (1, 1))
        check("another pilot sees nothing", visible("authenticated", other) == (0, 0))
        total = conn.execute("select count(*) from public.inspection_runs").fetchone()[0]
        check("admin sees every run", visible("authenticated", admin)[0] == total)
        ok, msg = raises(conn, """set role authenticated;
            select set_config('request.jwt.claim.sub', '%s', false);
            update public.inspection_runs set review_notes='x'""" % pilot, None)
        conn.execute("reset role")
        upd = conn.execute("select count(*) from public.inspection_runs where review_notes='x'"
                           ).fetchone()[0]
        check("pilot cannot write runs", upd == 0, msg)
        check("service role bypasses RLS (Sortie's writer)", visible("service_role", None)[0] == total)

    failed = [n for n, ok in RESULTS if not ok]
    print(f"\n{len(RESULTS) - len(failed)}/{len(RESULTS)} passed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
