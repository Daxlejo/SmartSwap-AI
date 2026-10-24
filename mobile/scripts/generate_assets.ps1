Add-Type -AssemblyName System.Drawing

function Create-Icon([int]$size, [string]$outPath, [bool]$isRound, [bool]$isForegroundOnly) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    if ($isForegroundOnly) {
        $g.Clear([System.Drawing.Color]::Transparent)
    } else {
        if ($isRound) {
            $g.Clear([System.Drawing.Color]::Transparent)
            $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 104, 95))
            $g.FillEllipse($brush, 0, 0, $size, $size)
            $brush.Dispose()
        } else {
            $g.Clear([System.Drawing.Color]::FromArgb(0, 104, 95))
        }
    }

    # Draw sync arrows in white
    # Scale factor from 48x48 base
    $scale = $size / 48.0
    if ($isForegroundOnly) {
        # Foreground of adaptive icon is 108dp, content in center 64dp
        $scale = ($size * 0.55) / 48.0
    } else {
        $scale = ($size * 0.72) / 48.0
    }
    
    $offsetX = ($size - (48.0 * $scale)) / 2.0
    $offsetY = ($size - (48.0 * $scale)) / 2.0

    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    
    # Path 1
    $p1 = New-Object System.Drawing.Drawing2D.GraphicsPath
    # Arrow 1: Upper arc and arrowhead
    # M24 10C16.27 10 10 16.27 10 24C10 27.5 11.27 30.7 13.4 33.2L16.2 30.4C14.83 28.6 14 26.4 14 24C14 18.48 18.48 14 24 14V18L30 12L24 6V10Z
    $p1.AddBezier((24*$scale + $offsetX), (10*$scale + $offsetY), (16.27*$scale + $offsetX), (10*$scale + $offsetY), (10*$scale + $offsetX), (16.27*$scale + $offsetY), (10*$scale + $offsetX), (24*$scale + $offsetY))
    $p1.AddBezier((10*$scale + $offsetX), (24*$scale + $offsetY), (10*$scale + $offsetX), (27.5*$scale + $offsetY), (11.27*$scale + $offsetX), (30.7*$scale + $offsetY), (13.4*$scale + $offsetX), (33.2*$scale + $offsetY))
    $p1.AddLine((13.4*$scale + $offsetX), (33.2*$scale + $offsetY), (16.2*$scale + $offsetX), (30.4*$scale + $offsetY))
    $p1.AddBezier((16.2*$scale + $offsetX), (30.4*$scale + $offsetY), (14.83*$scale + $offsetX), (28.6*$scale + $offsetY), (14*$scale + $offsetX), (26.4*$scale + $offsetY), (14*$scale + $offsetX), (24*$scale + $offsetY))
    $p1.AddBezier((14*$scale + $offsetX), (24*$scale + $offsetY), (14*$scale + $offsetX), (18.48*$scale + $offsetY), (18.48*$scale + $offsetX), (14*$scale + $offsetY), (24*$scale + $offsetX), (14*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (14*$scale + $offsetY), (24*$scale + $offsetX), (18*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (18*$scale + $offsetY), (30*$scale + $offsetX), (12*$scale + $offsetY))
    $p1.AddLine((30*$scale + $offsetX), (12*$scale + $offsetY), (24*$scale + $offsetX), (6*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (6*$scale + $offsetY), (24*$scale + $offsetX), (10*$scale + $offsetY))
    $p1.CloseFigure()
    $g.FillPath($whiteBrush, $p1)

    # Path 2
    # Arrow 2: Lower arc and arrowhead
    # M24 38C31.73 38 38 31.73 38 24C38 20.5 36.73 17.3 34.6 14.8L31.8 17.6C33.17 19.4 34 21.6 34 24C34 29.52 29.52 34 24 34V30L18 36L24 42V38Z
    $p2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p2.AddBezier((24*$scale + $offsetX), (38*$scale + $offsetY), (31.73*$scale + $offsetX), (38*$scale + $offsetY), (38*$scale + $offsetX), (31.73*$scale + $offsetY), (38*$scale + $offsetX), (24*$scale + $offsetY))
    $p2.AddBezier((38*$scale + $offsetX), (24*$scale + $offsetY), (38*$scale + $offsetX), (20.5*$scale + $offsetY), (36.73*$scale + $offsetX), (17.3*$scale + $offsetY), (34.6*$scale + $offsetX), (14.8*$scale + $offsetY))
    $p2.AddLine((34.6*$scale + $offsetX), (14.8*$scale + $offsetY), (31.8*$scale + $offsetX), (17.6*$scale + $offsetY))
    $p2.AddBezier((31.8*$scale + $offsetX), (17.6*$scale + $offsetY), (33.17*$scale + $offsetX), (19.4*$scale + $offsetY), (34*$scale + $offsetX), (21.6*$scale + $offsetY), (34*$scale + $offsetX), (24*$scale + $offsetY))
    $p2.AddBezier((34*$scale + $offsetX), (24*$scale + $offsetY), (34*$scale + $offsetX), (29.52*$scale + $offsetY), (29.52*$scale + $offsetX), (34*$scale + $offsetY), (24*$scale + $offsetX), (34*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (34*$scale + $offsetY), (24*$scale + $offsetX), (30*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (30*$scale + $offsetY), (18*$scale + $offsetX), (36*$scale + $offsetY))
    $p2.AddLine((18*$scale + $offsetX), (36*$scale + $offsetY), (24*$scale + $offsetX), (42*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (42*$scale + $offsetY), (24*$scale + $offsetX), (38*$scale + $offsetY))
    $p2.CloseFigure()
    $g.FillPath($whiteBrush, $p2)

    $parentDir = Split-Path -Parent $outPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $whiteBrush.Dispose()
    $p1.Dispose()
    $p2.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

function Create-Splash([int]$width, [int]$height, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap $width, $height
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # #00685f background
    $g.Clear([System.Drawing.Color]::FromArgb(0, 104, 95))

    # Center white circle (80dp-scaled)
    $minDim = [Math]::Min($width, $height)
    $circleSize = $minDim * 0.22
    if ($circleSize -lt 60) { $circleSize = 60 }
    if ($circleSize -gt 240) { $circleSize = 240 }

    $circleX = ($width - $circleSize) / 2.0
    $circleY = ($height - $circleSize) / 2.0

    # Draw white circular emblem
    $whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $g.FillEllipse($whiteBrush, $circleX, $circleY, $circleSize, $circleSize)

    # Inside circle, draw green sync icon
    $scale = ($circleSize * 0.58) / 48.0
    $offsetX = ($width - (48.0 * $scale)) / 2.0
    $offsetY = ($height - (48.0 * $scale)) / 2.0

    $greenBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(0, 104, 95))

    $p1 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p1.AddBezier((24*$scale + $offsetX), (10*$scale + $offsetY), (16.27*$scale + $offsetX), (10*$scale + $offsetY), (10*$scale + $offsetX), (16.27*$scale + $offsetY), (10*$scale + $offsetX), (24*$scale + $offsetY))
    $p1.AddBezier((10*$scale + $offsetX), (24*$scale + $offsetY), (10*$scale + $offsetX), (27.5*$scale + $offsetY), (11.27*$scale + $offsetX), (30.7*$scale + $offsetY), (13.4*$scale + $offsetX), (33.2*$scale + $offsetY))
    $p1.AddLine((13.4*$scale + $offsetX), (33.2*$scale + $offsetY), (16.2*$scale + $offsetX), (30.4*$scale + $offsetY))
    $p1.AddBezier((16.2*$scale + $offsetX), (30.4*$scale + $offsetY), (14.83*$scale + $offsetX), (28.6*$scale + $offsetY), (14*$scale + $offsetX), (26.4*$scale + $offsetY), (14*$scale + $offsetX), (24*$scale + $offsetY))
    $p1.AddBezier((14*$scale + $offsetX), (24*$scale + $offsetY), (14*$scale + $offsetX), (18.48*$scale + $offsetY), (18.48*$scale + $offsetX), (14*$scale + $offsetY), (24*$scale + $offsetX), (14*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (14*$scale + $offsetY), (24*$scale + $offsetX), (18*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (18*$scale + $offsetY), (30*$scale + $offsetX), (12*$scale + $offsetY))
    $p1.AddLine((30*$scale + $offsetX), (12*$scale + $offsetY), (24*$scale + $offsetX), (6*$scale + $offsetY))
    $p1.AddLine((24*$scale + $offsetX), (6*$scale + $offsetY), (24*$scale + $offsetX), (10*$scale + $offsetY))
    $p1.CloseFigure()
    $g.FillPath($greenBrush, $p1)

    $p2 = New-Object System.Drawing.Drawing2D.GraphicsPath
    $p2.AddBezier((24*$scale + $offsetX), (38*$scale + $offsetY), (31.73*$scale + $offsetX), (38*$scale + $offsetY), (38*$scale + $offsetX), (31.73*$scale + $offsetY), (38*$scale + $offsetX), (24*$scale + $offsetY))
    $p2.AddBezier((38*$scale + $offsetX), (24*$scale + $offsetY), (38*$scale + $offsetX), (20.5*$scale + $offsetY), (36.73*$scale + $offsetX), (17.3*$scale + $offsetY), (34.6*$scale + $offsetX), (14.8*$scale + $offsetY))
    $p2.AddLine((34.6*$scale + $offsetX), (14.8*$scale + $offsetY), (31.8*$scale + $offsetX), (17.6*$scale + $offsetY))
    $p2.AddBezier((31.8*$scale + $offsetX), (17.6*$scale + $offsetY), (33.17*$scale + $offsetX), (19.4*$scale + $offsetY), (34*$scale + $offsetX), (21.6*$scale + $offsetY), (34*$scale + $offsetX), (24*$scale + $offsetY))
    $p2.AddBezier((34*$scale + $offsetX), (24*$scale + $offsetY), (34*$scale + $offsetX), (29.52*$scale + $offsetY), (29.52*$scale + $offsetX), (34*$scale + $offsetY), (24*$scale + $offsetX), (34*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (34*$scale + $offsetY), (24*$scale + $offsetX), (30*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (30*$scale + $offsetY), (18*$scale + $offsetX), (36*$scale + $offsetY))
    $p2.AddLine((18*$scale + $offsetX), (36*$scale + $offsetY), (24*$scale + $offsetX), (42*$scale + $offsetY))
    $p2.AddLine((24*$scale + $offsetX), (42*$scale + $offsetY), (24*$scale + $offsetX), (38*$scale + $offsetY))
    $p2.CloseFigure()
    $g.FillPath($greenBrush, $p2)

    $parentDir = Split-Path -Parent $outPath
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $whiteBrush.Dispose()
    $greenBrush.Dispose()
    $p1.Dispose()
    $p2.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

$resDir = "android/app/src/main/res"

# Standard icons
Create-Icon 48  "$resDir/mipmap-mdpi/ic_launcher.png" $false $false
Create-Icon 72  "$resDir/mipmap-hdpi/ic_launcher.png" $false $false
Create-Icon 96  "$resDir/mipmap-xhdpi/ic_launcher.png" $false $false
Create-Icon 144 "$resDir/mipmap-xxhdpi/ic_launcher.png" $false $false
Create-Icon 192 "$resDir/mipmap-xxxhdpi/ic_launcher.png" $false $false

# Round icons
Create-Icon 48  "$resDir/mipmap-mdpi/ic_launcher_round.png" $true $false
Create-Icon 72  "$resDir/mipmap-hdpi/ic_launcher_round.png" $true $false
Create-Icon 96  "$resDir/mipmap-xhdpi/ic_launcher_round.png" $true $false
Create-Icon 144 "$resDir/mipmap-xxhdpi/ic_launcher_round.png" $true $false
Create-Icon 192 "$resDir/mipmap-xxxhdpi/ic_launcher_round.png" $true $false

# Foreground adaptive icons (transparent background, white sync arrows)
Create-Icon 108 "$resDir/mipmap-mdpi/ic_launcher_foreground.png" $false $true
Create-Icon 162 "$resDir/mipmap-hdpi/ic_launcher_foreground.png" $false $true
Create-Icon 216 "$resDir/mipmap-xhdpi/ic_launcher_foreground.png" $false $true
Create-Icon 324 "$resDir/mipmap-xxhdpi/ic_launcher_foreground.png" $false $true
Create-Icon 432 "$resDir/mipmap-xxxhdpi/ic_launcher_foreground.png" $false $true

# Splash screens
Create-Splash 480 800 "$resDir/drawable/splash.png"
Create-Splash 320 480 "$resDir/drawable-port-mdpi/splash.png"
Create-Splash 480 800 "$resDir/drawable-port-hdpi/splash.png"
Create-Splash 720 1280 "$resDir/drawable-port-xhdpi/splash.png"
Create-Splash 960 1600 "$resDir/drawable-port-xxhdpi/splash.png"
Create-Splash 1280 1920 "$resDir/drawable-port-xxxhdpi/splash.png"

Create-Splash 480 320 "$resDir/drawable-land-mdpi/splash.png"
Create-Splash 800 480 "$resDir/drawable-land-hdpi/splash.png"
Create-Splash 1280 720 "$resDir/drawable-land-xhdpi/splash.png"
Create-Splash 1600 960 "$resDir/drawable-land-xxhdpi/splash.png"
Create-Splash 1920 1280 "$resDir/drawable-land-xxxhdpi/splash.png"

Write-Host "All assets generated successfully!"
