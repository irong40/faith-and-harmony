// POST /build-deliverable
// Spawns build_deliverable.py for a given site_visit and reports progress
// via the shared status store used by /status/:jobId.
//
// Body: { site_id, visit_id, job_id, video_path? }

const path = require('path');
const { spawn } = require('child_process');

const PY = process.env.PYTHON_EXE || 'python';
const SCRIPT = path.resolve(
  __dirname,
  '..', '..',
  'construction-deliverable',
  'build_deliverable.py'
);

function register(app, statusStore) {
  app.post('/build-deliverable', async (req, res) => {
    const { site_id, visit_id, job_id, video_path } = req.body || {};
    if (!site_id || !visit_id || !job_id) {
      return res.status(400).json({
        error: 'site_id, visit_id, job_id are required',
      });
    }

    statusStore.set(job_id, {
      stage: 'build_deliverable',
      status: 'running',
      started_at: new Date().toISOString(),
    });

    const args = ['--site_id', site_id, '--visit_id', visit_id];
    if (video_path) args.push('--video', video_path);

    const child = spawn(PY, [SCRIPT, ...args], {
      cwd: path.dirname(SCRIPT),
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(`[deliverable ${job_id}] ${text}`);
      statusStore.set(job_id, {
        stage: 'build_deliverable',
        status: 'running',
        last_log: text.trim().slice(-500),
      });
    });
    child.stderr.on('data', chunk => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(`[deliverable ${job_id}] ${text}`);
    });

    child.on('close', code => {
      if (code !== 0) {
        statusStore.set(job_id, {
          stage: 'build_deliverable',
          status: 'failed',
          exit_code: code,
          stderr: stderr.slice(-2000),
          finished_at: new Date().toISOString(),
        });
        return;
      }
      let parsed = null;
      try {
        const jsonStart = stdout.lastIndexOf('{');
        if (jsonStart >= 0) parsed = JSON.parse(stdout.slice(jsonStart));
      } catch (_) { /* leave parsed null */ }
      statusStore.set(job_id, {
        stage: 'build_deliverable',
        status: 'completed',
        result: parsed,
        finished_at: new Date().toISOString(),
      });
    });

    res.json({
      job_id,
      status: 'started',
      poll: `/status/${job_id}`,
    });
  });
}

module.exports = { register };
