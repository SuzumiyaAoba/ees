#!/bin/bash

# API パッケージ内のファイルで shared と entities の import を @ees/core に置換する

find packages/api/src -name "*.ts" -type f -exec sed -i '' \
  -e 's|from "@/shared/|from "@ees/core|g' \
  -e 's|from "@/entities/|from "@ees/core|g' \
  -e 's|import {.*} from "@/shared"|import {}&; s/} from "@ees/core"/} from "@ees/core"/g' \
  {} \;

echo "Import paths updated in API package"