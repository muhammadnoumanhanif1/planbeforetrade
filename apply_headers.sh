#!/bin/bash

# Array of files to update
files=(
  "src/app/page.tsx"
  "src/features/analysis/AnalysisDashboard.tsx"
  "src/features/market-structure-signals/MarketStructureSignalsClient.tsx"
)

for file in "${files[@]}"; do
  # We want to replace:
  # <header className={styles.header}>
  #   <div>
  #     <p className={styles.kicker}>Plan Before Trade</p>
  #     <h1>CRYPTO COINS ANALYSIS PLATFORM</h1>
  #   </div>
  <meta name="google-adsense-account" content="ca-pub-1436344877676413">
  # 
  # With:
  # <header className={styles.header}>
  #   <div className={styles.headerTitleWrapper}>
  #     <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
  #     <div>
  #       <p className={styles.kicker}>Plan Before Trade</p>
  #       <h1>CRYPTO COINS ANALYSIS PLATFORM</h1>
  #     </div>
  #   </div>
  
  sed -i 's|<header className={styles.header}.*>|<header className={styles.header}>|g' "$file"
  sed -i 's|<header className={styles.header}>|<header className={styles.header}>\n          <div className={styles.headerTitleWrapper}>\n            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />|g' "$file"
  # wait, I just prepended to the <header> tag! That will mess up the inner <div>
done
