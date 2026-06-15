const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      getFiles(filePath, fileList);
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const files = getFiles('src');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (content.includes('className={styles.header}')) {
    // Let's replace:
    // <header className={styles.header} ... >
    //   <div>
    //     <p className={styles.kicker}>
    // With:
    // <header className={styles.header} ... >
    //   <div className={styles.headerTitleWrapper}>
    //     <img src="/logo.png" alt="Plan Before Trade" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
    //     <div>
    //       <p className={styles.kicker}>
    
    // Replace:
    // </div>
    //         <p className={styles.subtitle}> (or <h1>)
    // with 
    // </div>
    //       </div>
    
    // We can do this easily:
    const target = /<header className=\{styles\.header\}([^>]*)>\s*<div>\s*<p className=\{styles\.kicker\}/;
    if (target.test(content) && !content.includes('headerTitleWrapper')) {
      content = content.replace(
        /<header className=\{styles\.header\}([^>]*)>\s*<div>\s*<p className=\{styles\.kicker\}/,
        `<header className={styles.header}$1>
          <div className={styles.headerTitleWrapper}>
            <img src="/logo.png" alt="Plan Before Trade Logo" style={{ width: 100, height: 100, objectFit: "contain", flexShrink: 0 }} />
            <div>
              <p className={styles.kicker}`
      );
      
      // Close the wrapper right after the </div> that closes the <div> we just added.
      // Usually it's:
      //     <h1>CRYPTO COINS ANALYSIS PLATFORM</h1>
      //   </div>
      // So we replace:
      //   </h1>\n          </div>
      // With:
      //   </h1>\n          </div>\n          </div>
      // Or if there is a subtitle:
      //   </p>\n          </div>
      
      content = content.replace(
        /(<\/h1>|<\/p>)\s*<\/div>/,
        `$1\n            </div>\n          </div>`
      );
      
      fs.writeFileSync(file, content);
      console.log(`Updated ${file}`);
    }
  }
}
