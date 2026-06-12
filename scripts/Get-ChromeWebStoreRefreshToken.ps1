[CmdletBinding(DefaultParameterSetName = "ClientValues")]
param(
    [Parameter(ParameterSetName = "ClientFile", Mandatory = $true)]
    [string]$ClientConfigPath,

    [Parameter(ParameterSetName = "ClientValues")]
    [string]$ClientId,

    [Parameter(ParameterSetName = "ClientValues")]
    [string]$ClientSecret,

    [string]$Code,

    [switch]$SetGitHubSecret,

    [string]$SecretName = "CHROME_WEBSTORE_REFRESH_TOKEN",

    [string]$Repository
)

$ErrorActionPreference = "Stop"

function ConvertTo-PlainText {
    param(
        [Parameter(Mandatory = $true)]
        [System.Security.SecureString]$SecureString
    )

    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureString)
    try {
        [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
}

if ($PSCmdlet.ParameterSetName -eq "ClientFile") {
    if (-not (Test-Path -LiteralPath $ClientConfigPath -PathType Leaf)) {
        throw "OAuth client JSON was not found: $ClientConfigPath"
    }

    $config = Get-Content -Raw -LiteralPath $ClientConfigPath | ConvertFrom-Json
    $client = if ($config.installed) {
        $config.installed
    } elseif ($config.web) {
        $config.web
    } else {
        throw "OAuth client JSON must contain either an 'installed' or 'web' client."
    }

    $ClientId = $client.client_id
    $ClientSecret = $client.client_secret
}

if (-not $ClientId) {
    $ClientId = Read-Host "OAuth client ID"
}

if (-not $ClientSecret) {
    $ClientSecret = ConvertTo-PlainText (Read-Host "OAuth client secret" -AsSecureString)
}

if (-not $Code) {
    $Code = Read-Host "Authorization code from Chrome Web Store API test step"
}

$curl = Get-Command curl.exe -ErrorAction Stop
$responseFile = New-TemporaryFile

try {
    $httpStatus = & $curl.Source `
        -sS `
        -o $responseFile.FullName `
        -w "%{http_code}" `
        "https://accounts.google.com/o/oauth2/token" `
        --data-urlencode "client_id=$ClientId" `
        --data-urlencode "client_secret=$ClientSecret" `
        --data-urlencode "code=$Code" `
        --data-urlencode "grant_type=authorization_code" `
        --data-urlencode "redirect_uri=urn:ietf:wg:oauth:2.0:oob"

    $responseBody = Get-Content -Raw -LiteralPath $responseFile.FullName

    if ($LASTEXITCODE -ne 0) {
        throw "curl.exe failed with exit code $LASTEXITCODE."
    }

    if ($httpStatus -lt 200 -or $httpStatus -ge 300) {
        Write-Host $responseBody
        throw "OAuth token exchange failed with HTTP $httpStatus. Generate a fresh authorization code and verify it was created with the same OAuth client ID and secret."
    }

    $tokenResponse = $responseBody | ConvertFrom-Json
} finally {
    Remove-Item -LiteralPath $responseFile.FullName -Force -ErrorAction SilentlyContinue
}

if (-not $tokenResponse.refresh_token) {
    throw "Google returned no refresh_token. The authorization code may have expired, already been used, or been created for a different OAuth client."
}

if ($SetGitHubSecret) {
    $ghArgs = @("secret", "set", $SecretName, "--app", "actions")
    if ($Repository) {
        $ghArgs += @("--repo", $Repository)
    }

    $tokenResponse.refresh_token | gh @ghArgs
    Write-Host "Saved $SecretName as a GitHub Actions secret."
} else {
    Write-Host "Save this value as the GitHub Actions secret ${SecretName}:"
    Write-Host $tokenResponse.refresh_token
}
