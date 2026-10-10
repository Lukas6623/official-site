<#
    ServerGuard - local preview server (no dependencies)

    Serves this folder over HTTP on http://localhost:8000/ using built-in
    .NET classes only. Runs with Windows PowerShell 5.1, which ships with
    Windows 10 and Windows 11. No Node.js, Python or other runtime is
    required.

    Usage (open PowerShell in the project folder):

        powershell -ExecutionPolicy Bypass -File .\serve.ps1
        powershell -ExecutionPolicy Bypass -File .\serve.ps1 -Port 8080

    Stop with Ctrl + C.
#>

[CmdletBinding()]
param(
    [int]$Port = 8000,
    [string]$Root = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

$Root = (Resolve-Path -LiteralPath $Root).Path
$rootPrefix = $Root
if (-not $rootPrefix.EndsWith('\')) {
    $rootPrefix += '\'
}

$mime = @{
    '.html'  = 'text/html; charset=utf-8'
    '.htm'   = 'text/html; charset=utf-8'
    '.css'   = 'text/css; charset=utf-8'
    '.js'    = 'application/javascript; charset=utf-8'
    '.json'  = 'application/json; charset=utf-8'
    '.svg'   = 'image/svg+xml'
    '.ico'   = 'image/x-icon'
    '.png'   = 'image/png'
    '.jpg'   = 'image/jpeg'
    '.jpeg'  = 'image/jpeg'
    '.gif'   = 'image/gif'
    '.webp'  = 'image/webp'
    '.woff'  = 'font/woff'
    '.woff2' = 'font/woff2'
    '.ttf'   = 'font/ttf'
    '.txt'   = 'text/plain; charset=utf-8'
    '.xml'   = 'application/xml; charset=utf-8'
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()

Write-Host ''
Write-Host '  ServerGuard - local preview'
Write-Host "  Folder : $Root"
Write-Host "  URL    : http://localhost:$Port/"
Write-Host ''
Write-Host '  Press Ctrl + C to stop.'
Write-Host ''

function Write-Response {
    param(
        [System.IO.Stream]$Stream,
        [int]$Status,
        [string]$Reason,
        [byte[]]$Body,
        [string]$ContentType
    )

    $head = "HTTP/1.1 $Status $Reason`r`n"
    $head += "Content-Type: $ContentType`r`n"
    $head += "Content-Length: $($Body.Length)`r`n"
    $head += "Connection: close`r`n"
    $head += "Cache-Control: no-store`r`n"
    $head += "`r`n"

    $headBytes = [System.Text.Encoding]::ASCII.GetBytes($head)
    $Stream.Write($headBytes, 0, $headBytes.Length)
    if ($Body.Length -gt 0) {
        $Stream.Write($Body, 0, $Body.Length)
    }
    $Stream.Flush()
}

while ($true) {
    $client = $listener.AcceptTcpClient()

    try {
        $stream = $client.GetStream()
        $stream.ReadTimeout = 5000

        $buffer = New-Object byte[] 2048
        $builder = New-Object System.Text.StringBuilder
        $end = -1

        while ($end -lt 0) {
            $read = $stream.Read($buffer, 0, $buffer.Length)
            if ($read -le 0) { break }
            [void]$builder.Append([System.Text.Encoding]::ASCII.GetString($buffer, 0, $read))
            $end = $builder.ToString().IndexOf("`r`n`r`n")
            if ($builder.Length -gt 32768) { break }
        }

        $requestLine = ($builder.ToString() -split "`r`n")[0]
        $parts = $requestLine -split ' '
        if ($parts.Length -lt 2) { continue }

        $method = $parts[0].ToUpperInvariant()
        $target = $parts[1]

        $path = ($target -split '\?')[0]
        $path = [System.Uri]::UnescapeDataString($path)
        if ([string]::IsNullOrEmpty($path)) { $path = '/' }

        if ($method -ne 'GET' -and $method -ne 'HEAD') {
            Write-Response $stream 405 'Method Not Allowed' ([System.Text.Encoding]::UTF8.GetBytes('405 Method Not Allowed')) 'text/plain; charset=utf-8'
            continue
        }

        $relative = $path.TrimStart('/')
        $full = [System.IO.Path]::GetFullPath((Join-Path $Root $relative))

        if ($full -ne $Root -and -not $full.StartsWith($rootPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
            Write-Response $stream 403 'Forbidden' ([System.Text.Encoding]::UTF8.GetBytes('403 Forbidden')) 'text/plain; charset=utf-8'
            continue
        }

        if (Test-Path -LiteralPath $full -PathType Container) {
            $full = Join-Path $full 'index.html'
        }

        if (Test-Path -LiteralPath $full -PathType Leaf) {
            $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
            $type = $mime[$ext]
            if (-not $type) { $type = 'application/octet-stream' }
            $body = [System.IO.File]::ReadAllBytes($full)
            if ($method -eq 'HEAD') { $body = New-Object byte[] 0 }
            Write-Response $stream 200 'OK' $body $type
        }
        else {
            Write-Response $stream 404 'Not Found' ([System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $path")) 'text/plain; charset=utf-8'
        }
    }
    catch {
        $null = $_
    }
    finally {
        if ($client) {
            try { $client.Close() } catch { $null = $_ }
        }
    }
}
