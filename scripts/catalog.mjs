// SPDX-License-Identifier: MIT
import {readFile, readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve, join, relative} from 'node:path';
import {PNG} from 'pngjs';
export const root=resolve(import.meta.dirname,'..');
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
export function safePath(value){if(typeof value!=='string'||! /^(?:png|webp)\/[a-z0-9-]+\.(?:png|webp)$/.test(value))throw new Error('Unsafe artwork path');return value;}
export async function verifyAsset(base,asset){
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id))throw new Error('Invalid artwork ID');
  safePath(asset.file);if(asset.file!=='png/'+asset.id+'.png')throw new Error('Artwork ID/path mismatch');
  const bytes=await readFile(join(base,asset.file));
  if(bytes.length!==asset.bytes||sha256(bytes)!==asset.sha256)throw new Error('Original PNG integrity mismatch: '+asset.id);
  const decoded=PNG.sync.read(bytes);if(decoded.width!==asset.width||decoded.height!==asset.height)throw new Error('PNG dimensions mismatch: '+asset.id);
  if(asset.license!=='CC0-1.0')throw new Error('Missing artwork grant');
  if(asset.webp){safePath(asset.webp.file);const webp=await readFile(join(base,asset.webp.file));if(webp.length!==asset.webp.bytes||sha256(webp)!==asset.webp.sha256||webp.toString('ascii',0,4)!=='RIFF'||webp.toString('ascii',8,12)!=='WEBP')throw new Error('WebP integrity mismatch: '+asset.id);}
}
export async function walk(base,dir=''){let files=[];for(const entry of (await readdir(join(base,dir),{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){if(entry.name==='.DS_Store'||!dir&&['node_modules','site','release','output','.git'].includes(entry.name))continue;if(entry.name.startsWith('.env')||['.git','.data','node_modules','__MACOSX'].includes(entry.name))throw new Error('Private folder cannot enter a release');const file=dir?dir+'/'+entry.name:entry.name;if(entry.isSymbolicLink())throw new Error('Symlinks cannot enter a release: '+file);if(entry.isDirectory())files.push(...await walk(base,file));else if(entry.isFile())files.push(file);}return files;}
export const publicEntries=['collection-pages.css','icons','product-header.js','product-chrome.css','index.html','gallery.css','gallery.js','collection-download.js','gallery.json','manifest.json','LICENSE','LICENSE-CODE','ASSET_LICENSES.md','png','webp','vendor','licenses','provenance','accent-engine.js'];
export const sourceEntries=[...publicEntries,'README.md','RELEASE_NOTES.md','CONTRIBUTING.md','SECURITY.md','package.json','package-lock.json','.gitignore','.github','scripts','tests'];
export async function existing(entries){const all=await readdir(root);return entries.filter(entry=>all.includes(entry));}
export async function scanText(base,files){for(const file of files){if(!/\.(?:json|html|js|mjs|md|txt|css|yaml|yml)$/.test(file)&&!file.startsWith('LICENSE'))continue;const text=await readFile(join(base,file),'utf8');const privatePath=/\/Users\/[^/\s]+\/(?:Projects|Documents)\//;const secret=/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|figd_[A-Za-z0-9_-]{30,}|sb_secret_[A-Za-z0-9_-]{30,}|AIza[A-Za-z0-9_-]{30,}|(?:AKIA|ASIA)[A-Z0-9]{16}|sk-(?:proj-)?[A-Za-z0-9_-]{32,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/;if(privatePath.test(text)||secret.test(text))throw new Error('Private content found in '+file);}}

export async function verifyCatalog(base=root){
  const manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8')),config=JSON.parse(await readFile(join(base,'gallery.json'),'utf8')),info=JSON.parse(await readFile(join(base,'package.json'),'utf8'));
  if(manifest.version!==info.version||manifest.assets.length!==config.expectedAssets||new Set(manifest.assets.map(a=>a.id)).size!==manifest.assets.length)throw new Error('Wrong, duplicate or inconsistent collection version');
  const expected=new Set();for(const asset of manifest.assets){expected.add(asset.file);if(asset.preview!==(asset.webp?.file??asset.file))throw new Error('Preview path mismatch');if(asset.webp){if(asset.webp.file!=='webp/'+asset.id+'.webp')throw new Error('WebP ID/path mismatch');expected.add(asset.webp.file);}await verifyAsset(base,asset);}
  for(const folder of ['png','webp']){const entries=await readdir(base);if(!entries.includes(folder))continue;for(const file of await walk(base,folder))if(!expected.has(file))throw new Error('Uncataloged artwork cannot be published: '+file);}
  if(![config.hero,config.secondary].every(id=>manifest.assets.some(a=>a.id===id)))throw new Error('Missing hero artwork');return manifest;
}
