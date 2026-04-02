param(
    [Parameter(Mandatory = $true)]
    [string]$CallSid,
    [string]$Host_ = "complicated-earliest-yeast-desired.trycloudflare.com"
)

$url = "wss://$Host_/ws/transcript?callSid=$CallSid"

$ws = New-Object System.Net.WebSockets.ClientWebSocket
$ct = New-Object System.Threading.CancellationToken

Write-Host "Connecting to $url ..."
$ws.ConnectAsync([Uri]$url, $ct).Wait()
Write-Host "Connected. Listening for transcript..."

$buffer = New-Object byte[] 4096

while ($ws.State -eq [System.Net.WebSockets.WebSocketState]::Open) {
    $result = $ws.ReceiveAsync([ArraySegment[byte]]$buffer, $ct).Result

    if ($result.MessageType -eq [System.Net.WebSockets.WebSocketMessageType]::Close) {
        break
    }

    $text = [System.Text.Encoding]::UTF8.GetString($buffer, 0, $result.Count)
    try {
        $json = $text | ConvertFrom-Json
        if ($json.error) {
            Write-Host "Error: $($json.error)" -ForegroundColor Red
            break
        }
        $color = if ($json.role -eq "caller") { "Cyan" } else { "Green" }
        Write-Host "[$($json.role)] $($json.text)" -ForegroundColor $color
    }
    catch {
        Write-Host $text
    }
}

$ws.Dispose()
Write-Host "Disconnected."
