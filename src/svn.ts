import * as child_process from 'child_process';
import * as fs from 'fs';
import path from 'path';
import { Blame } from './git';

export type SvnBlameModel = {
    revision: string;
    author: string;
    date: string;
    lineCount: number;
    lines: {
        lineNum: number;
        content: string;
    }[];
};

/**
 * 执行 svn 命令
 */
async function exec(workDir: string, args: string[], timeoutMs?: number): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const svn = child_process.spawn('svn', args, { cwd: workDir });
        let stdout = '';
        let stderr = '';
        let timer: NodeJS.Timeout | undefined;

        if (timeoutMs) {
            timer = setTimeout(() => {
                svn.kill();
                reject(new Error(`SVN command timed out after ${timeoutMs}ms`));
            }, timeoutMs);
        }

        svn.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        svn.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        svn.on('close', (code) => {
            if (timer) { clearTimeout(timer); }
            if (code !== 0) {
                reject(new Error(`SVN command failed with code ${code}: ${stderr}`));
                return;
            }
            resolve(stdout);
        });

        svn.on('error', (err) => {
            if (timer) { clearTimeout(timer); }
            reject(err);
        });
    });
}

/**
 * 检测文件路径对应的 SVN 仓库目录
 */
export async function getSvnRepository(filePath: string): Promise<string> {
    const dir = path.dirname(filePath);
    try {
        const result = await exec(dir, ['info', '--xml']);
        // 解析 SVN info XML 获取 repository root
        const rootMatch = result.match(/<root>([^<]+)<\/root>/);
        if (rootMatch) {
            // 返回包含 .svn 的目录
            const wcInfoMatch = result.match(/<wcinfo>([^<]+)<\/wcinfo>/);
            if (wcInfoMatch) {
                const wcRootMatch = result.match(/<wcroot-abspath>([^<]+)<\/wcroot-abspath>/);
                if (wcRootMatch) {
                    return wcRootMatch[1];
                }
            }
            // 如果找不到 wcroot，尝试向上查找
            return await findSvnRoot(dir);
        }
        return "";
    } catch (error) {
        return "";
    }
}

/**
 * 向上查找 SVN 工作副本根目录
 */
async function findSvnRoot(dir: string): Promise<string> {
    try {
        const result = await exec(dir, ['info', '--xml']);
        if (result.includes('<wcinfo>')) {
            const wcRootMatch = result.match(/<wcroot-abspath>([^<]+)<\/wcroot-abspath>/);
            if (wcRootMatch) {
                return wcRootMatch[1];
            }
        }
        // 尝试父目录
        const parent = path.dirname(dir);
        if (parent !== dir) {
            return await findSvnRoot(parent);
        }
        return "";
    } catch {
        return "";
    }
}

/**
 * 检测是否为 SVN 工作副本
 */
export async function isSvnWorkingCopy(filePath: string): Promise<boolean> {
    const t0 = Date.now();
    // 向上查找 .svn 目录，无需执行任何命令
    let dir = path.dirname(filePath);
    while (true) {
        if (fs.existsSync(path.join(dir, '.svn'))) {
            console.log(`[SVN] isSvnWorkingCopy done (SVN) in ${Date.now() - t0}ms, found .svn at: ${dir}`);
            return true;
        }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
    }
    console.log(`[SVN] isSvnWorkingCopy done (not SVN) in ${Date.now() - t0}ms`);
    return false;
}

/**
 * 检测是否为 Git 仓库
 */
export async function isGitRepository(filePath: string): Promise<boolean> {
    const t0 = Date.now();
    // 向上查找 .git 目录，无需执行任何命令
    let dir = path.dirname(filePath);
    while (true) {
        if (fs.existsSync(path.join(dir, '.git'))) {
            console.log(`[GIT] isGitRepository done (Git) in ${Date.now() - t0}ms, found .git at: ${dir}`);
            return true;
        }
        const parent = path.dirname(dir);
        if (parent === dir) { break; }
        dir = parent;
    }
    console.log(`[GIT] isGitRepository done (not Git) in ${Date.now() - t0}ms`);
    return false;
}

/**
 * 执行 git 命令
 */
async function execGit(workDir: string, args: string[]): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const git = child_process.spawn('git', args, { cwd: workDir });
        let stdout = '';

        git.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        git.stderr.on('data', () => { });

        git.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Git command failed with code ${code}`));
                return;
            }
            resolve(stdout);
        });

        git.on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * 检测版本控制系统类型: 'git' | 'svn' | undefined
 * 优先检测 SVN，因为 SVN 工作副本通常更明确
 */
export async function detectVcsType(filePath: string): Promise<'git' | 'svn' | undefined> {
    const t0 = Date.now();
    // SVN 优先：先查 .svn，找到立即返回，不再检测 git
    if (await isSvnWorkingCopy(filePath)) {
        console.log(`[VCS] detectVcsType done in ${Date.now() - t0}ms, result: svn`);
        return 'svn';
    }
    if (await isGitRepository(filePath)) {
        console.log(`[VCS] detectVcsType done in ${Date.now() - t0}ms, result: git`);
        return 'git';
    }
    console.log(`[VCS] detectVcsType done in ${Date.now() - t0}ms, result: undefined`);
    return undefined;
}

/**
 * 获取文件的 SVN blame 信息
 */
export async function getSvnBlames(workDir: string, file: string): Promise<Blame[]> {
    console.log(`[SVN] getSvnBlames called - workDir: ${workDir}, file: ${file}`);
    // 使用 -x -w 忽略空白符变化，不使用 --ignore-eol-style（部分 SVN 版本不支持）
    try {
        const blameXml = await exec(workDir, ['blame', '--xml', '-x', '-w', '--', path.basename(file)]);
        console.log(`[SVN] blameXml received, length: ${blameXml.length}`);

        const blames: Blame[] = [];
        const entries: SvnBlameEntry[] = [];

        // 解析 XML 格式的 blame 输出
        // SVN blame XML 结构: <entry line-number="N"><commit revision="R"><author>...</author><date>...</date></commit></entry>
        const entryRegex = /<entry\s+line-number="(\d+)">([\s\S]*?)<\/entry>/g;
        let match;

        while ((match = entryRegex.exec(blameXml)) !== null) {
            const lineNum = parseInt(match[1]);
            const entryContent = match[2];

            // 提取 revision（在 <commit revision="..."> 上）
            const revisionMatch = entryContent.match(/<commit\s+revision="(\d+)"/);
            const revision = revisionMatch ? revisionMatch[1] : '0';

            // 提取作者
            const authorMatch = entryContent.match(/<author[^>]*>([^<]*)<\/author>/);
            const author = authorMatch ? authorMatch[1] : 'unknown';

            // 提取日期
            const dateMatch = entryContent.match(/<date[^>]*>([^<]*)<\/date>/);
            let timestamp = 0;
            if (dateMatch) {
                timestamp = Math.floor(new Date(dateMatch[1]).getTime() / 1000);
            }

            entries.push({
                revision,
                author,
                timestamp,
                lineNum
            });
        }

        console.log(`[SVN] Parsed ${entries.length} entries`);

        // 批量获取所有唯一 revision 的 log message（用 min:max 范围，兼容性好于逗号列表）
        const revisionMessages = new Map<string, string>();
        const uniqueRevisions = [...new Set(entries.map(e => e.revision).filter(r => r !== '0'))];
        if (uniqueRevisions.length > 0) {
            try {
                const nums = uniqueRevisions.map(Number);
                const minRev = Math.min(...nums);
                const maxRev = Math.max(...nums);
                const logXml = await exec(workDir, ['log', '--xml', '-r', `${minRev}:${maxRev}`, '--', path.basename(file)]);
                const logEntryRegex = /<logentry\s+revision="(\d+)">([\s\S]*?)<\/logentry>/g;
                let logMatch;
                while ((logMatch = logEntryRegex.exec(logXml)) !== null) {
                    const rev = logMatch[1];
                    const msgMatch = logMatch[2].match(/<msg[^>]*>([\s\S]*?)<\/msg>/);
                    if (msgMatch) {
                        revisionMessages.set(rev, msgMatch[1].trim());
                    }
                }
                console.log(`[SVN] Fetched log messages for ${revisionMessages.size} revisions`);
            } catch (e) {
                console.log(`[SVN] Failed to fetch log messages: ${e}`);
            }
        }

        // 按行号排序并转换为 Blame 格式
        entries.sort((a, b) => a.lineNum - b.lineNum);

        for (const entry of entries) {
            const msg = revisionMessages.get(entry.revision);
            blames.push({
                line: entry.lineNum,
                commit: entry.revision,
                author: entry.author,
                mail: '',
                timestamp: entry.timestamp,
                summary: msg || `r${entry.revision}`,
                commited: true,
                title: ''
            });
        }

        console.log(`[SVN] Returning ${blames.length} blames`);
        return blames;
    } catch (error) {
        console.log(`[SVN] getSvnBlames error: ${error}`);
        throw error;
    }
}

interface SvnBlameEntry {
    revision: string;
    author: string;
    timestamp: number;
    lineNum: number;
}
