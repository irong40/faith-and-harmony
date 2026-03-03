# Vapi Voice Bot Setup Guide

This guide walks you through the full Vapi configuration for Paula, the Sentinel Aerial Inspections intake coordinator. Follow each section in order. The system prompt, tool definitions, and assistant configuration JSON are all in this same directory.

---

## Prerequisites

Before you begin, confirm you have the following.

A Vapi account. Create one at https://vapi.ai if you do not already have one.

An ElevenLabs account with an API key. You can find your API key at https://elevenlabs.io under Profile, then API Keys.

The following files from this directory open and ready to copy from:
- system-prompt.md (the full system prompt for Paula)
- tools.json (the two tool definitions for pricing lookup and call transfer)
- assistant-config.json (the reference configuration with all settings)

Iron's actual phone number in E.164 format. This is the number that callers will be transferred to for escalated situations. The format is plus one followed by ten digits, for example plus 17575551234.

---

## Step 1: Add ElevenLabs API Key to Vapi

Paula uses an ElevenLabs voice for natural sounding speech. You need to connect your ElevenLabs account to Vapi before creating the assistant so the voice library can sync.

1. Log in to the Vapi Dashboard at https://dashboard.vapi.ai.
2. In the left navigation, go to Provider Keys (sometimes listed under Settings or Integrations depending on the current dashboard version).
3. Find the ElevenLabs section.
4. Paste your ElevenLabs API key into the key field.
5. Save.
6. Wait about 60 seconds for Vapi to sync the ElevenLabs voice catalog.

You will know the sync worked when the ElevenLabs voice library is available in the voice selector during assistant creation.

---

## Step 2: Create the Assistant

1. In the Vapi Dashboard, go to Assistants.
2. Click Create Assistant (or New Assistant).
3. Set the Name to "Paula - Sentinel Aerial Intake".
4. Under Model, select OpenAI as the provider.
5. Set the model to gpt-4o-mini.
6. Set Temperature to 0.7.
7. Set Max Tokens to 250.
8. Find the System Prompt field. Open system-prompt.md from this directory. Copy the full contents of that file and paste it into the System Prompt field.
9. Find the First Message field. Set it to exactly this text: Thank you for calling Sentinel Aerial Inspections. This is Paula. How can I help you today?
10. Find the End Call Message field. Set it to exactly this text: Thank you for calling Sentinel. We will follow up with you shortly. Have a great day.
11. Do not save yet. Continue to Step 3.

---

## Step 3: Configure the Voice

Still on the assistant creation or editing screen, find the Voice section.

1. Set the Voice Provider to ElevenLabs.
2. The voice library should now show the voices synced from your ElevenLabs account.
3. Search the catalog for a professional American female voice. Suggested search terms: "young professional" or "American female." Preview a few options using the play button.
4. Select the voice that sounds most natural for a professional intake call.
5. Note the voice ID shown for the selected voice. You will use this to fill in the ELEVENLABS_VOICE_ID_PLACEHOLDER if you need to recreate the assistant in the future.
6. Set the Voice Model to eleven_flash_v2_5. This is ElevenLabs' low latency model optimized for real time conversations.
7. Set Speed to 1.0.
8. Set Stability to 0.5.
9. Set Similarity to 0.75.
10. Use the preview button to test the voice with a short phrase before continuing.

---

## Step 4: Add Tool Definitions

The assistant needs two tools: one to look up live pricing mid call, and one to transfer callers to Iron for escalated situations.

1. In the assistant editor, find the Tools section.
2. Open tools.json from this directory.
3. Add each tool from that file to the assistant. The Vapi dashboard may allow you to paste JSON directly or may require entering each field manually. The tools.json file contains the exact configuration for both tools.
4. For the get_package_pricing tool, find the field for the apikey header under the server configuration. Replace SUPABASE_ANON_KEY_PLACEHOLDER with the actual Supabase anon key for project qjpujskwqaehxnqypxzu. You find this key in the Supabase Dashboard under Settings then API then the "anon public" key. This is the public anon key, not the service role key.
5. For the transferToSpecialist tool, find the destination number field. Replace +1IRON_PHONE_PLACEHOLDER with Iron's actual phone number in E.164 format, for example +17575551234.

Both tools must have their placeholders replaced with real values before the bot will work correctly.

---

## Step 5: Configure Timeouts and Settings

Still in the assistant editor, find the Settings or Advanced section.

1. Set Silence Timeout to 30 seconds. This tells the bot how long to wait after the caller stops speaking before prompting again.
2. Set Max Duration to 600 seconds. This limits calls to 10 minutes.
3. Enable Background Denoising. This reduces ambient noise on the caller's end.
4. Save the assistant.

After saving, you should see "Paula - Sentinel Aerial Intake" listed in your Assistants view.

---

## Step 6: Provision 757 Phone Number

1. In the Vapi Dashboard, go to Phone Numbers.
2. Click Create Phone Number or Buy Phone Number.
3. Select the Free Vapi Number tab.
4. Enter area code 757 in the area code field.
5. Click Create or Search.
6. Confirm the number and complete the provisioning.
7. Wait approximately 5 minutes for the number to activate. Calls made immediately after provisioning may not connect.
8. After 5 minutes, find the new number in the Phone Numbers list and click on it.
9. Under Inbound Call Handler, set the handler type to Assistant.
10. Select "Paula - Sentinel Aerial Intake" from the assistant dropdown.
11. Save.

The 757 number is now connected to Paula. Any call to that number will go through the Vapi voice pipeline and reach the assistant.

---

## Step 7: Test the Bot

Wait at least 5 minutes after provisioning the number before testing. Then call the 757 number from your personal phone.

Expected behavior during the test call:

Paula greets you with "Thank you for calling Sentinel Aerial Inspections. This is Paula. How can I help you today?"

Ask about a service. For example, say "I need photos of a house I am selling."

Paula should ask for the property location. Provide a Hampton Roads city such as Virginia Beach.

Paula should confirm you are in the service area and ask about the property type.

Continue through the qualification flow. Provide your timeline and any other details she asks for.

Ask about pricing for the Listing Pro package. Paula should call the get_package_pricing tool. You will hear her say "Let me look that up for you" briefly while the tool runs. She should then respond with "four hundred fifty dollars" and describe the deliverables.

Test the out of area path. Say your property is in Richmond. Paula should offer to transfer you to a specialist or take a callback number.

If all three scenarios work correctly, the bot is ready.

---

## Placeholder Reference

The following placeholders appear in the configuration files in this directory. Replace each one with the real value before the bot will function.

PASTE_SYSTEM_PROMPT_HERE
Copy the full contents of system-prompt.md from this directory and paste it into the System Prompt field in the Vapi assistant editor.

ELEVENLABS_VOICE_ID_PLACEHOLDER
Select from the ElevenLabs voice library inside the Vapi dashboard after entering your ElevenLabs API key. The voice ID appears when you hover over or select a voice. Record it here for future reference once you have chosen a voice.

SUPABASE_ANON_KEY_PLACEHOLDER
The anon key for Supabase project qjpujskwqaehxnqypxzu. Find it in the Supabase Dashboard under Settings then API. Use the row labeled "anon public." Do not use the service role key.

+1IRON_PHONE_PLACEHOLDER
Iron's phone number in E.164 format. E.164 format starts with a plus sign followed by the country code and the ten digit number, for example +17575551234. This number receives transferred calls when Paula escalates a situation.

PASTE_TOOLS_FROM_TOOLS_JSON
Copy the full JSON array from tools.json in this directory. This array contains both the get_package_pricing function tool and the transferToSpecialist transfer tool. After pasting, replace SUPABASE_ANON_KEY_PLACEHOLDER and +1IRON_PHONE_PLACEHOLDER with the real values as described above.
