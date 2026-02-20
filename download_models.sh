#!/bin/bash
set -e

MODELS_DIR="/var/www/cs2-skins/models"
BASE="https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src/%5Bmodels%5D"

sudo mkdir -p "$MODELS_DIR"
cd "$MODELS_DIR"

WEAPONS=(
  weapon_ak47 weapon_aug weapon_awp weapon_bizon weapon_cz75a
  weapon_deagle weapon_elite weapon_famas weapon_fiveseven weapon_g3sg1
  weapon_galilar weapon_glock weapon_hkp2000 weapon_m249 weapon_m4a1
  weapon_m4a1_silencer weapon_mac10 weapon_mag7 weapon_mp5sd weapon_mp7
  weapon_mp9 weapon_negev weapon_nova weapon_p250 weapon_p90
  weapon_revolver weapon_sawedoff weapon_scar20 weapon_sg556 weapon_ssg08
  weapon_tec9 weapon_ump45 weapon_usp_silencer weapon_xm1014
  weapon_knife_bayonet weapon_knife_butterfly weapon_knife_canis
  weapon_knife_cord weapon_knife_css weapon_knife_falchion weapon_knife_flip
  weapon_knife_gut weapon_knife_gypsy_jackknife weapon_knife_karambit
  weapon_knife_m9_bayonet weapon_knife_outdoor weapon_knife_push
  weapon_knife_saber weapon_knife_skeleton weapon_knife_stiletto
  weapon_knife_survival_bowie weapon_knife_tactical weapon_knife_ursus
  weapon_knife_widowmaker
)

echo "Downloading ${#WEAPONS[@]} weapon models..."
for w in "${WEAPONS[@]}"; do
  if [ -f "$w.glb" ]; then
    echo "  skip $w (exists)"
  else
    if sudo wget -q --timeout=30 "$BASE/$w.glb" -O "$w.glb" 2>/dev/null; then
      echo "  ok   $w"
    else
      sudo rm -f "$w.glb"
      echo "  miss $w"
    fi
  fi
done

echo "Downloading environment.hdr..."
if [ ! -f "environment.hdr" ]; then
  sudo wget -q "https://raw.githubusercontent.com/LielXD/CS2-WeaponPaints-Website/refs/heads/main/src/environment.hdr" -O environment.hdr
  echo "  ok   environment.hdr"
else
  echo "  skip environment.hdr (exists)"
fi

sudo chown -R www-data:www-data "$MODELS_DIR"
echo "Done. Files in $MODELS_DIR:"
ls -lh "$MODELS_DIR" | tail -20
