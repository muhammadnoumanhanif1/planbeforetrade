#!/bin/bash
files=$(grep -rl "<header className={styles.header}" src)

for file in $files; do
  # Replace `<header className={styles.header}>\n          <div>` with the wrapper and logo
  # Since whitespace varies, let's use perl:
  perl -0777 -pi -e 's/<header className=\{styles\.header\}([^>]*)>\s*<div(?: className=\{styles\.headerTitleWrapper\})?>/<header className={styles.header}$1>\n          <div className={styles.headerTitleWrapper}>\n            <img src="\/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} \/>\n            <div>/g' "$file"
done
