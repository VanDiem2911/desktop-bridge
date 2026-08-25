# ChatGPT Web desktop bridge

This local service lets the n8n workflow send an image prompt to a Chrome window where you have already signed in to ChatGPT. It listens only on 127.0.0.1:3001.

## One-time setup

From this directory, install the dependencies without entering the n8n monorepo workspace:

~~~powershell
pnpm --ignore-workspace install
~~~

## Start it

~~~powershell
cd desktop-bridge
.\open-dashboard.bat
~~~

Verify it:

~~~powershell
Invoke-RestMethod http://127.0.0.1:3001/health
~~~

It should return ok: true.

## n8n node

In Agent 5 – ChatGPT Web robot, use POST and set the URL to:

- n8n runs directly on Windows: http://127.0.0.1:3001/generate
- n8n runs in Docker: http://host.docker.internal:3001/generate

Use this raw JSON body expression:

~~~js
{{ JSON.stringify({ action: 'generate_chatgpt_image', prompt: $json.imagePrompt, aspectRatio: $json.aspectRatio }) }}
~~~

The response contains imageBase64, mimeType, and fileName, ready for the next n8n node.

## Safety

The bridge does not save your ChatGPT password and does not attempt to bypass sign-in, CAPTCHA, or browser checks. If ChatGPT asks for verification, complete it manually in the dedicated Chrome window.
