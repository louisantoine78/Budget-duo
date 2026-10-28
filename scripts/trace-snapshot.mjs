#!/usr/bin/env node
/* Portable local JSON backup, not a database client or a production restore.
 * create raw-export.json snapshot.json [--source-commit SHA]
 * verify snapshot.json [--expected-documents N] [--expected-members N]
 *   [--expected-collections source-counts.json] [--expected-household-id UUID]
 *   [--expected-source-commit SHA]
 * fingerprint independent-source-export.json (prints a read-only SHA-256 inventory)
 * unpack snapshot.json restored-export.json [ALL --expected-* guards required,
 *   including --expected-payload-sha256 SHA256 from an independent source export]
 * Inputs are supplied explicitly; no credentials, network, deletion or overwrite.
 */
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const FORMAT='trace-snapshot/1';
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
function canonical(value){
 if(value===null||typeof value==='string'||typeof value==='boolean')return JSON.stringify(value);
 if(typeof value==='number'&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)
  return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';
 throw Error('Export non JSON : valeur non finie, absente ou objet spécial');
}
const checksum=value=>createHash('sha256').update(canonical(value)).digest('hex');
const SHA256=/^[a-f0-9]{64}$/;
function inventory(payload){
 if(!payload||typeof payload!=='object'||!payload.household||!UUID.test(payload.household.id)||
    !Array.isArray(payload.household_members)||!Array.isArray(payload.documents))
  throw Error('Export attendu : household, household_members et documents complets');
 if(Object.keys(payload).sort().join(',')!=='documents,household,household_members')
  throw Error('Tables supplémentaires : les exporter et vérifier séparément, sans les ignorer');
 const householdId=payload.household.id,memberIds=new Set(),slots=new Set(),ids=new Set(),collections=new Map();
 if(payload.household_members.length<1||payload.household_members.length>2)throw Error('Inventaire des membres incohérent');
 for(const member of payload.household_members){
  if(member.household_id!==householdId||!UUID.test(member.user_id)||
     !['la','partner'].includes(member.slot)||memberIds.has(member.user_id)||slots.has(member.slot))
   throw Error('Membre invalide, autre foyer ou doublon');
  memberIds.add(member.user_id);slots.add(member.slot);
 }
 for(const row of payload.documents){
  if(!row||row.household_id!==householdId||typeof row.collection!=='string'||!row.collection||
     typeof row.item_id!=='string'||!row.item_id||!row.data||typeof row.data!=='object'||Array.isArray(row.data))
   throw Error('Document invalide ou issu d’un autre foyer');
  const key=JSON.stringify([row.collection,row.item_id]);
  if(ids.has(key))throw Error('Clé de document dupliquée');ids.add(key);
  collections.set(row.collection,(collections.get(row.collection)||0)+1);
 }
 canonical(payload); // Reject lossy JSON serialization before calculating totals.
 return{householdId,members:memberIds.size,documents:ids.size,
  collections:Object.fromEntries([...collections].sort(([a],[b])=>a.localeCompare(b)))};
}
// Derive this from a separately obtained, read-only export of the source tables,
// NEVER from the snapshot currently being tested. A matching digest alone does
// not attest that the upstream database export was exhaustive.
// SQL SELECT without ORDER BY can legitimately return the exact same rows in
// another order. Normalize only top-level table rows, not arrays inside data:
// their order may itself carry financial meaning (allocations, statements).
function sourceDigest(payload){
 const cmp=(a,b)=>a<b?-1:a>b?1:0;
 return checksum({household:payload.household,
  household_members:[...payload.household_members].sort((a,b)=>cmp(a.user_id,b.user_id)),
  documents:[...payload.documents].sort((a,b)=>
   cmp(a.collection,b.collection)||cmp(a.item_id,b.item_id))});
}
export function sourceFingerprint(payload){
 return{...inventory(payload),payloadSha256:sourceDigest(payload),completenessVerified:false};
}
export function createSnapshot(payload,{createdAt=new Date().toISOString(),sourceCommit=null}={}){
 const counts=inventory(payload);
 if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(createdAt)||
    !Number.isFinite(Date.parse(createdAt))||new Date(createdAt).toISOString()!==createdAt)
  throw Error('Date de sauvegarde invalide');
 if(sourceCommit!==null&&!/^[a-f0-9]{40}$/.test(sourceCommit))throw Error('Commit source invalide');
 const content={format:FORMAT,createdAt,sourceCommit,
  completeness:'source-export-not-independently-verified',inventory:counts,
  payload:JSON.parse(canonical(payload))};
 return{...content,sha256:checksum(content)};
}
export function verifySnapshot(snapshot,{expectedDocuments,expectedMembers,expectedCollections,
 expectedHouseholdId,expectedSourceCommit,expectedPayloadSha256}={}){
 if(!snapshot||snapshot.format!==FORMAT||!/^[a-f0-9]{64}$/.test(snapshot.sha256||''))
  throw Error('Format ou empreinte de sauvegarde invalide');
 const {sha256,...content}=snapshot;
 if(checksum(content)!==sha256)throw Error('Empreinte SHA-256 différente : sauvegarde altérée');
 const actual=inventory(snapshot.payload);
 if(canonical(actual)!==canonical(snapshot.inventory))throw Error('Inventaire de sauvegarde incohérent');
 // This also checks dates, source reference and the honest completeness label.
 if(checksum(createSnapshot(snapshot.payload,{createdAt:snapshot.createdAt,sourceCommit:snapshot.sourceCommit}))!==checksum(snapshot))
  throw Error('Métadonnées de sauvegarde incohérentes');
 if(expectedHouseholdId!==undefined&&(!UUID.test(expectedHouseholdId)||
    actual.householdId!==expectedHouseholdId))
  throw Error('Foyer différent de celui attendu pour la restauration');
 if(expectedSourceCommit!==undefined&&(!/^[a-f0-9]{40}$/.test(expectedSourceCommit)||
    snapshot.sourceCommit!==expectedSourceCommit))
  throw Error('Commit source différent de celui attendu');
 if(expectedPayloadSha256!==undefined&&(!SHA256.test(expectedPayloadSha256)||
    sourceDigest(snapshot.payload)!==expectedPayloadSha256))
  throw Error('Empreinte du contenu différente du relevé source indépendant');
 if(expectedDocuments!==undefined&&(!Number.isSafeInteger(expectedDocuments)||expectedDocuments<0||actual.documents!==expectedDocuments))
  throw Error('Nombre de documents différent du comptage indépendant attendu');
 if(expectedMembers!==undefined&&(!Number.isSafeInteger(expectedMembers)||expectedMembers<1||
    expectedMembers>2||actual.members!==expectedMembers))
  throw Error('Nombre de membres différent du comptage indépendant attendu');
 if(expectedCollections!==undefined){
  if(!expectedCollections||typeof expectedCollections!=='object'||
     Array.isArray(expectedCollections)||Object.getPrototypeOf(expectedCollections)!==Object.prototype||
     !Object.entries(expectedCollections).every(([name,count])=>name.length>0&&
      Number.isSafeInteger(count)&&count>0)||
     canonical(expectedCollections)!==canonical(actual.collections))
   throw Error('Collections différentes des comptages indépendants attendus');
 }
 // Expected counts must originate from independently queried source tables.
 // Even matching counts cannot certify the provenance or completeness of the source query.
 return{...actual,sha256,integrityVerified:true,completenessVerified:false};
}
export function unpackSnapshot(snapshot,expectations={}){
 verifySnapshot(snapshot,expectations);
 return JSON.parse(canonical(snapshot.payload));
}
async function main(args){
 const [action,input,output]=args;
 if(!['create','fingerprint','verify','unpack'].includes(action)||!input||!['fingerprint','verify'].includes(action)&&!output)
  throw Error('Usage : trace-snapshot.mjs create|fingerprint|verify|unpack entrée.json [sortie.json] [options]');
 // Typos must never silently skip a restore safety guard or accept stray values.
 const validOptions=action==='create'?['--source-commit']:
  action==='fingerprint'?[]:[
  '--expected-documents','--expected-members','--expected-collections',
  '--expected-household-id','--expected-source-commit','--expected-payload-sha256'];
 for(let i=['verify','fingerprint'].includes(action)?2:3;i<args.length;i+=2){
  if(!validOptions.includes(args[i])||i+1>=args.length||
     args[i+1].startsWith('--'))throw Error('Option inconnue ou incomplète : '+args[i]);
 }
 const json=JSON.parse(await readFile(resolve(input),'utf8'));
 if(action==='fingerprint'){
  console.log(JSON.stringify(sourceFingerprint(json)));return;
 }
 const option=name=>{const i=args.indexOf(name);if(i<0)return undefined;
  if(args.indexOf(name,i+1)!==-1)throw Error('Option répétée : '+name);
  if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Valeur manquante : '+name);
  return args[i+1];};
 if(action==='verify'||action==='unpack'){
  // The unpack path MUST enforce the same independent source counts as verify.
  // A valid checksum alone does not establish that a source export was complete.
  const expected=option('--expected-documents'),members=option('--expected-members');
  const householdId=option('--expected-household-id');
  const sourceCommit=option('--expected-source-commit');
  const payloadSha=option('--expected-payload-sha256');
  const collectionsPath=option('--expected-collections');
  if(action==='unpack'&&(!householdId||!sourceCommit&&json.sourceCommit!==null||
     !expected||!members||!collectionsPath||!payloadSha))
   throw Error('Extraction refusée : foyer, commit source (si présent), inventaire et empreinte du relevé source indépendant obligatoires');
  if(expected!==undefined&&!/^\d+$/.test(expected))throw Error('Comptage attendu invalide');
  if(members!==undefined&&!/^[12]$/.test(members))throw Error('Comptage des membres attendu invalide');
  const expectedCollections=collectionsPath===undefined?undefined:
   JSON.parse(await readFile(resolve(collectionsPath),'utf8'));
  const expectations={
   expectedDocuments:expected===undefined?undefined:Number(expected),
   expectedMembers:members===undefined?undefined:Number(members),
   expectedCollections,expectedHouseholdId:householdId,expectedSourceCommit:sourceCommit,
   expectedPayloadSha256:payloadSha
  };
  if(action==='verify')console.log(JSON.stringify(verifySnapshot(json,expectations)));
  else{
   const restored=unpackSnapshot(json,expectations);
   await writeFile(resolve(output),JSON.stringify(restored,null,2)+'\n',{flag:'wx',mode:0o600});
   console.log('Export local extrait et contrôlé. Aucune base modifiée.');
  }
 }else{
  const result=createSnapshot(json,{sourceCommit:option('--source-commit')||null});
  await writeFile(resolve(output),JSON.stringify(result,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log('Sauvegarde locale créée. Exhaustivité de l’export source à vérifier séparément.');
 }
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main(process.argv.slice(2)).catch(error=>{
 console.error(error.message);process.exitCode=1;
});
