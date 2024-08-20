// lib.ts - utility functions
import { exec, ExecException, ExecOptions } from 'child_process';
import { Diff } from './Diff';

export interface ExecResult {
  err?: Error;
  stdout: string;
  stderr: string;
}

export async function execCommand(command: string, options: ExecOptions = {}): Promise<ExecResult> {
  return new Promise<ExecResult>(async (done, failed) => {
    exec(command, options, (err: ExecException | null, stdout: string, stderr: string): void => {
      const res: ExecResult = {
        stdout,
        stderr
      };
      if (err) {
        res.err = err;
        failed(res);
        return;
      }
      done(res);
    });
  });
}

export function scrubSecrets(input: string): string {
  let output = input;
  // Match argocd `--auth-token` flag used when logging in. Used to scrub this
  // from the PR comment body.
  const authTokenMatches = input.match(/--auth-token=((\w+\S)+)/);
  if (authTokenMatches) {
    output = output.replace(new RegExp(authTokenMatches[1], 'g'), '***');
  }
  return output;
}


// OPTION 1.
// option of removing parts of each application diff iteratively 
export function truncateDiffOutput(diffArray: Diff[], maxLength: number = 65536): Diff[] {
  let jsonString = JSON.stringify(diffArray);
  let currentLength = jsonString.length;

  if (currentLength < maxLength) {
    return diffArray; // within limit
  }
  // need to iterate over array of apps diffs.
  for (let i = 0; i < diffArray.length; i++) {
    let diff = diffArray[i];

    const excessLength = currentLength - maxLength;
    if (diff.diff.length > excessLength) {
      diff.diff = diff.diff.slice(0, diff.diff.length - excessLength);
    } else {
      diff.diff = ""; //remove if smaller
    }

    // recalc size with trimmed diff
    jsonString = JSON.stringify(diffArray);
    currentLength = jsonString.length;

    // if still too long, trim error field if exists
    if (currentLength > maxLength && diff.error) {
      const errorLength = currentLength - maxLength;
      const errorString = JSON.stringify(diff.error);
      diff.error = JSON.parse(errorString.slice(0, errorString.length - errorLength)) as ExecResult;

      jsonString = JSON.stringify(diffArray);
      currentLength = jsonString.length;
    }

    //stop trimming if within limit
    if (currentLength < maxLength) {
      break;
    }
  }
  return diffArray;

}

// OPTION 2. (with extra options inside :) )
//Option of poping elements from the array completely until below limit.
export function truncateOutputArray(diffOutput: string[], maxLength: number = 65536): string[] {
  let jsonString = JSON.stringify(diffOutput);
  let currentLength = jsonString.length;

  if (currentLength < maxLength) {
    return diffOutput;
  }

  while (currentLength > maxLength && diffOutput.length > 0) {
    diffOutput.pop();
    jsonString = JSON.stringify(diffOutput);
    currentLength = jsonString.length;
  }

  return diffOutput;

  // Alternative which truncates strings from end of array.
  // can be combined with above as a failsafe

  // for (let i = diffOutput.length - 1; i >= 0; i--) {
  //   const excessLength = currentLength - maxLength;

  //   if (diffOutput[i].length > excessLength) {
  //     diffOutput[i] = diffOutput[i].slice(0, diffOutput[i].length - excessLength);
  //   } else {
  //     diffOutput[i] = ""; // if string smaller than excess
  //   }

  //   jsonString = JSON.stringify(diffOutput);
  //   currentLength = jsonString.length;

  //   if (currentLength < maxLength) {
  //     break;
  //   }
  // }
}
