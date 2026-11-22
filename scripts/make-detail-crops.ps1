$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$root = Join-Path $PSScriptRoot '..\public\images\products'
$root = (Resolve-Path $root).Path
$slugs = @(
  'x01-aero','vanta-runner','court-900','nova-high','halo-knit','apex-trail',
  'lumen-flow','static-x','orbit-low','phase-02','element-90','vector-elite'
)

$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$encoder = [System.Drawing.Imaging.Encoder]::Quality
$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters 1
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter $encoder, 82L

function New-Crop {
  param(
    [string]$Source,
    [string]$Destination,
    [double]$Zoom,
    [double]$FocusX,
    [double]$FocusY,
    [int]$Output = 900
  )

  $src = [System.Drawing.Image]::FromFile($Source)
  try {
    $cropW = [int]([Math]::Round($src.Width * $Zoom))
    $cropH = [int]([Math]::Round($src.Height * $Zoom))
    $cropW = [Math]::Min($cropW, $src.Width)
    $cropH = [Math]::Min($cropH, $src.Height)

    $x = [int]([Math]::Round(($src.Width - $cropW) * $FocusX))
    $y = [int]([Math]::Round(($src.Height - $cropH) * $FocusY))
    $x = [Math]::Max(0, [Math]::Min($x, $src.Width - $cropW))
    $y = [Math]::Max(0, [Math]::Min($y, $src.Height - $cropH))

    $dest = New-Object System.Drawing.Bitmap $Output, $Output
    try {
      $dest.SetResolution(96, 96)
      $g = [System.Drawing.Graphics]::FromImage($dest)
      try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $g.DrawImage(
          $src,
          (New-Object System.Drawing.Rectangle 0, 0, $Output, $Output),
          (New-Object System.Drawing.Rectangle $x, $y, $cropW, $cropH),
          [System.Drawing.GraphicsUnit]::Pixel
        )
      }
      finally {
        $g.Dispose()
      }
      $dest.Save($Destination, $codec, $encoderParams)
    }
    finally {
      $dest.Dispose()
    }
  }
  finally {
    $src.Dispose()
  }
}

foreach ($slug in $slugs) {
  $one = Join-Path $root "$slug-1.jpg"
  $two = Join-Path $root "$slug-2.jpg"
  if (-not (Test-Path $one) -or -not (Test-Path $two)) {
    Write-Warning "Missing source for $slug"
    continue
  }
  New-Crop -Source $one -Destination (Join-Path $root "$slug-3.jpg") -Zoom 0.82 -FocusX 0.5 -FocusY 0.5
  New-Crop -Source $two -Destination (Join-Path $root "$slug-4.jpg") -Zoom 0.66 -FocusX 0.45 -FocusY 0.55
  Write-Output "crops -> $slug"
}

$encoderParams.Dispose()
Write-Output "done"
