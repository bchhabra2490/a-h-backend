import { execSync } from "child_process";
import fs from "fs";
const clipFile = async (fileName: string, startInterval: number, endInterval: number): Promise<string | null> => {
    const clipFileName = `${fileName}-${startInterval}-${endInterval}.webm`;
    // Ensure file is closed and flushed
    fs.closeSync(fs.openSync(fileName, 'r'));
          
    // Add a small delay to ensure file is ready
    await new Promise(resolve => setTimeout(resolve, 100));

    try {
      execSync(`ffmpeg -ss ${startInterval} -t ${endInterval - startInterval} -i ${fileName} -c copy ${clipFileName}`);
      return clipFileName;
    } catch (error) {
      console.error('Error processing clip:', error);
      return null;
    }

}

export { clipFile };