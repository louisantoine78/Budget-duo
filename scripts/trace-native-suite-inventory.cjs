'use strict';
// Offline, read-only comparison of the exact committed test suite against the
// checkout's files. A count floor alone cannot detect swapped/missing suites.
const TEST_PATH=/^tests\/[^/]+\.test\.cjs$/;
function checkCommittedSuiteInventory({treeOutput='',files=[],exitCode=0,signal=null,error=null,
  contentDiffStatus=0,contentDiffError=null,contentDiffSignal=null}={}){
 const names=String(treeOutput).split(/\r?\n/).filter(Boolean);
 const tracked=names.filter(name=>TEST_PATH.test(name));
 const actual=files.map(name=>'tests/'+name).filter(name=>TEST_PATH.test(name));
 const expected=new Set(tracked),present=new Set(actual);
 const missing=tracked.filter(name=>!present.has(name)).sort();
 const unexpected=actual.filter(name=>!expected.has(name)).sort();
 const unique=expected.size===tracked.length&&present.size===actual.length;
 const gitReadable=exitCode===0&&!signal&&!error&&tracked.length>0;
 // Git compares actual worktree/index bytes and modes against the HEAD tree.
 // Equal names alone must not certify a modified or staged test suite.
 const trackedContentsClean=contentDiffStatus===0&&!contentDiffError&&!contentDiffSignal;
 return {passed:gitReadable&&trackedContentsClean&&unique&&!missing.length&&!unexpected.length,
  gitReadable,trackedContentsClean,trackedCount:tracked.length,checkoutCount:actual.length,
  missing,unexpected,duplicates:!unique};
}
module.exports={checkCommittedSuiteInventory};
