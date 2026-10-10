#!/bin/bash
if [ ! -d /copies ]; then
  echo "Close this window, open LinLab again, then run bash ./copy-work.sh"
  exit 1
fi
stamp=$(date +%Y-%m-%d-%H%M%S)
cp -a /work "/copies/work-$stamp"
echo "Saved a copy. On this PC it is C:\\Users\\johnw\\Projects\\linlab\\work-copies\\work-$stamp"
