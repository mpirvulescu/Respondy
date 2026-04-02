$API = "https://complicated-earliest-yeast-desired.trycloudflare.com/api/calls"

# Step 1: Start the call (greeting plays automatically when answered)
$response = Invoke-RestMethod -Method POST -Uri $API `
  -ContentType "application/json" `
  -Body '{"to": "+17788672985", "greeting": "Hello! This is a demo call. Please say something."}'

$CALL_SID = $response.callSid
Write-Host "Call started: $CALL_SID"
Write-Host "Open another terminal and run:"
Write-Host "  .\scripts\demo-transcript.ps1 -CallSid $CALL_SID"
Write-Host ""
Write-Host "Waiting for call to be answered..."
Start-Sleep -Seconds 20

# Step 2: Say something mid-call
Write-Host "Sending speech..."
Invoke-RestMethod -Method POST -Uri "$API/$CALL_SID/say" `
  -ContentType "application/json" `
  -Body '{"text": "Thank you for speaking with us. Is there anything else?"}'

Start-Sleep -Seconds 15

# Step 3: Say goodbye
Invoke-RestMethod -Method POST -Uri "$API/$CALL_SID/say" `
  -ContentType "application/json" `
  -Body '{"text": "Thanks for your time. Goodbye!", "voice": "Polly.Matthew"}'

Start-Sleep -Seconds 5

# Step 4: Print full transcript
Write-Host "`n=== Full Transcript ==="
$call = Invoke-RestMethod -Uri "$API/$CALL_SID"
$call.transcript | ForEach-Object {
  Write-Host "[$($_.role)] $($_.text)"
}

# Step 5: Hang up
Invoke-RestMethod -Method POST -Uri "$API/$CALL_SID/hangup"
Write-Host "`nCall ended."
