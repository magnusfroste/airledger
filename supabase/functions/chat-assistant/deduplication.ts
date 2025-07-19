
import { FunctionCallArgs } from './types.ts';

// Cache för att spåra genomförda function calls under sessionen
const sessionCallCache = new Map<string, any>();

// Funktion för att skapa en hash/fingerprint av function arguments
function createCallFingerprint(functionName: string, args: FunctionCallArgs): string {
  const sortedArgs = JSON.stringify(args, Object.keys(args).sort());
  return `${functionName}:${sortedArgs}`;
}

// Funktion för att kontrollera om en function call redan har gjorts
export function isDuplicateCall(functionName: string, args: FunctionCallArgs, conversationId?: string): boolean {
  const fingerprint = createCallFingerprint(functionName, args);
  const sessionKey = conversationId ? `${conversationId}:${fingerprint}` : fingerprint;
  
  if (sessionCallCache.has(sessionKey)) {
    console.log('Duplicate function call detected:', functionName, args);
    return true;
  }
  
  return false;
}

// Funktion för att markera en function call som genomförd
export function markCallAsExecuted(functionName: string, args: FunctionCallArgs, result: any, conversationId?: string): void {
  const fingerprint = createCallFingerprint(functionName, args);
  const sessionKey = conversationId ? `${conversationId}:${fingerprint}` : fingerprint;
  
  sessionCallCache.set(sessionKey, {
    timestamp: new Date().toISOString(),
    result: result,
    functionName: functionName,
    args: args
  });
  
  console.log('Function call marked as executed:', sessionKey);
}

// Funktion för att få resultat från tidigare call (om duplikat)
export function getPreviousCallResult(functionName: string, args: FunctionCallArgs, conversationId?: string): any {
  const fingerprint = createCallFingerprint(functionName, args);
  const sessionKey = conversationId ? `${conversationId}:${fingerprint}` : fingerprint;
  
  return sessionCallCache.get(sessionKey)?.result;
}

// Funktion för att rensa gamla calls (kan köras periodiskt)
export function clearOldCalls(olderThanMinutes: number = 60): void {
  const cutoffTime = new Date(Date.now() - (olderThanMinutes * 60 * 1000));
  
  for (const [key, value] of sessionCallCache.entries()) {
    if (new Date(value.timestamp) < cutoffTime) {
      sessionCallCache.delete(key);
    }
  }
}
