#!/bin/bash
# Re-do this safely
files=$(grep -rl "<header className={styles.header}" src)

for file in $files; do
  # Replace `<header className={styles.header}>` with it + `<div style={{display:flex...}}>`
  # Then we need to inject `</div>` after the title. This is hard to do cleanly with sed.
  # Let's do it using perl or manually for the top ones.
  echo "$file"
done
