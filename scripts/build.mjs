import {renderGallerySeo} from './seo.mjs';
// SPDX-License-Identifier: MIT
import {cp,mkdir,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {root,publicEntries,existing,walk,scanText,verifyCatalog} from './catalog.mjs';
await verifyCatalog();await scanText(root,await walk(root));const site=join(root,'site');await rm(site,{recursive:true,force:true});await mkdir(site);
for(const entry of await existing(publicEntries))await cp(join(root,entry),join(site,entry),{recursive:true,filter:path=>!path.endsWith('/.DS_Store')});
await renderGallerySeo(root,site);
await scanText(site,await walk(site));console.log('Built static gallery in site/');
