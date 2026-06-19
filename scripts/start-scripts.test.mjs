import { readFileSync } from 'node:fs'
import test from 'node:test'
import assert from 'node:assert/strict'

const startBe = readFileSync(new URL('../start-be.bat', import.meta.url), 'utf8')
const startFe = readFileSync(new URL('../start-fe.bat', import.meta.url), 'utf8')
const startMl = readFileSync(new URL('../start-ml.bat', import.meta.url), 'utf8')

test('start scripts restart occupied app ports instead of serving stale code', () => {
  assert.match(startBe, /call :restart_port 8080 LGABLEBAND_BE/)
  assert.match(startFe, /call :restart_port 5173 LGABLEBAND_FE_APP/)
  assert.match(startFe, /call :restart_port 5174 LGABLEBAND_FE_WEARABLE/)
  assert.doesNotMatch(startBe, /\[SKIP\]/)
  assert.doesNotMatch(startFe, /\[SKIP\]/)
})

test('frontend scripts force Vite to stay on the ngrok target ports', () => {
  assert.match(startFe, /npm run dev -- --host 0\.0\.0\.0 --port 5173 --strictPort/)
  assert.match(startFe, /npm run dev -- --host 0\.0\.0\.0 --port 5174 --strictPort/)
})

test('frontend script stops when either app port cannot be restarted', () => {
  assert.match(
    startFe,
    /call :restart_port 5173 LGABLEBAND_FE_APP[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/
  )
  assert.match(
    startFe,
    /call :restart_port 5174 LGABLEBAND_FE_WEARABLE[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/
  )
})

test('restart commands avoid cmd-sensitive PowerShell pipeline syntax', () => {
  assert.doesNotMatch(startBe, /Get-NetTCPConnection[^\r\n]*\|/)
  assert.doesNotMatch(startFe, /Get-NetTCPConnection[^\r\n]*\|/)
})

test('start commands pass working directories separately from shell commands', () => {
  assert.ok(startBe.includes('call :restart_port 8080 LGABLEBAND_BE "%~dp0BE" ".\\mvnw.cmd spring-boot:run"'))
  assert.ok(startFe.includes('call :restart_port 5173 LGABLEBAND_FE_APP "%~dp0FE\\app" "npm run dev -- --host 0.0.0.0 --port 5173 --strictPort"'))
  assert.ok(startFe.includes('call :restart_port 5174 LGABLEBAND_FE_WEARABLE "%~dp0FE\\wearable" "npm run dev -- --host 0.0.0.0 --port 5174 --strictPort"'))
  assert.ok(startBe.includes('start "%TARGET_NAME%" /D "%TARGET_DIR%" cmd /k "%TARGET_COMMAND%"'))
  assert.ok(startFe.includes('start "%TARGET_NAME%" /D "%TARGET_DIR%" cmd /k "%TARGET_COMMAND%"'))
})

test('startup scripts fail fast when a required service cannot restart', () => {
  assert.match(startBe, /call :restart_port 8080 LGABLEBAND_BE[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/)
  assert.match(startFe, /call :restart_port 5173 LGABLEBAND_FE_APP[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/)
  assert.match(startFe, /call :restart_port 5174 LGABLEBAND_FE_WEARABLE[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/)
  assert.match(startMl, /call :start_and_wait 8000 \/health LGABLEBAND_CONTEXT_AI[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/)
  assert.match(startMl, /call :start_and_wait 8004 \/health LGABLEBAND_INFO_AGENT[^\r\n]*\r?\nif errorlevel 1 exit \/b %errorlevel%/)
})

test('ML startup waits for AI health checks and restarts stale ports', () => {
  assert.match(startMl, /:start_and_wait/)
  assert.match(startMl, /Stop-Process -Id \$owner -Force/)
  assert.match(startMl, /did not become healthy on port %TARGET_PORT%/)
  assert.match(startMl, /\[OK\] %TARGET_NAME% is healthy on port %TARGET_PORT%/)
})
