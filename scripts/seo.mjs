// Build the same artwork catalog into HTML so images and downloads work before JS.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import sharp from 'sharp';
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderGallerySeo(base,out){
  const config=JSON.parse(await readFile(join(base,'gallery.json'),'utf8'));
  const manifest=JSON.parse(await readFile(join(base,'manifest.json'),'utf8'));
  await mkdir(join(out,'previews'),{recursive:true});
  for(const asset of manifest.assets)await sharp(join(base,asset.file)).resize({width:480,height:480,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toFile(join(out,'previews',asset.id+'.webp'));
  const origin=`https://${config.slug}.kens-toolbox.com`;
  const title=config.kind==='blue'?'Duoquill | Free blue illustrations & transparent PNGs':'Clovlets | Free clay stickers & transparent PNGs';
  let html=await readFile(join(out,'index.html'),'utf8');
  html=html.replace(/<title>[\s\S]*?<\/title>/,`<title>${escape(title)}</title>`).replace(/<meta property="og:title" content="[^"]*">/,`<meta property="og:title" content="${escape(title)}">`);
  const hero=manifest.assets.find(a=>a.id===config.hero);
  await sharp(join(base,hero.file)).resize(1200,630,{fit:'contain',background:config.kind==='blue'?'#edf1ff':'#f6f2eb'}).webp({quality:88}).toFile(join(out,'social.webp'));
  html=html.replace(/<meta property="og:image" content="[^"]*">/,`<meta property="og:image" content="${origin}/social.webp">`);
  const graph=[{'@type':'WebSite','@id':origin+'/#website',name:config.name,url:origin+'/',inLanguage:'en',publisher:{'@type':'Person',name:'Ken Pan'}},{'@type':'CollectionPage','@id':origin+'/#webpage',name:title,description:config.description,url:origin+'/',inLanguage:'en',isPartOf:{'@id':origin+'/#website'},mainEntity:{'@id':origin+'/#artwork'}},{'@type':'ItemList','@id':origin+'/#artwork',numberOfItems:manifest.assets.length,itemListElement:manifest.assets.map((a,i)=>({'@type':'ListItem',position:i+1,item:{'@type':'ImageObject','@id':origin+'/'+a.file,name:a.title,description:a.alt,contentUrl:origin+'/'+a.file,thumbnailUrl:origin+'/previews/'+a.id+'.webp',width:a.width,height:a.height,license:'https://creativecommons.org/publicdomain/zero/1.0/',acquireLicensePage:origin+'/#permissions',creditText:'Ken Pan · '+config.name,creator:{'@type':'Person',name:'Ken Pan'}}}))}];
  const tags=`<meta name="robots" content="index, follow, max-image-preview:large"><meta property="og:site_name" content="${config.name}"><meta property="og:locale" content="en_US"><meta property="og:image:alt" content="${escape(hero.alt)}"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(config.description)}"><meta name="twitter:image" content="${origin}/social.webp"><meta name="twitter:image:alt" content="${escape(hero.alt)}"><script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':graph}).replace(/</g,'\\u003c')}</script>`;
  html=html.replace('</head>',tags+'</head>');
  const cards=manifest.assets.map(a=>`<div class="tile" role="listitem" data-asset-id="${a.id}"><a href="${a.file}" download><span class="tile-art"><img src="previews/${a.id}.webp" alt="${escape(a.alt)}" width="${a.width}" height="${a.height}" loading="lazy" decoding="async"></span><span class="tile-title">${escape(a.title)}</span><span class="tile-type">${escape(a.groupLabel)}</span></a></div>`).join('');
  const pattern=/(<div\b[^>]*\bid="grid"[^>]*>)\s*(<\/div>)/;
  if(!pattern.test(html))throw new Error('Expected empty gallery grid');
  html=html.replace(pattern,(_,a,b)=>a+cards+b).replace('<section class="reuse">','<section class="reuse" id="permissions">');
  await writeFile(join(out,'index.html'),html);
  const images=manifest.assets.map(a=>`<image:image><image:loc>${origin}/${escape(a.file)}</image:loc></image:image>`).join('');
  await writeFile(join(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"><url><loc>${origin}/</loc>${images}</url></urlset>\n`);
  await writeFile(join(out,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  await writeFile(join(out,'_headers'),`/sitemap.xml\n  Content-Type: application/xml; charset=utf-8\n/*.md\n  Content-Type: text/markdown; charset=utf-8\n  X-Robots-Tag: noindex\n`);
  console.log(`SEO: ${manifest.assets.length} artwork links, images and license metadata in static HTML`);
}
