// Dark factory: works a project's Kanzo board with a coding agent, one ticket at a time, unattended.
// Takes the top "todo" ticket, runs the agent in the production repository, accepts the attempt only when
// files changed, no protected file changed and the verify command passes, then commits it and moves it to review.
// A failed attempt is reset and retried with the errors; after `attempts` failures the ticket is skipped,
// and tickets that depend on a skipped, blocked or human ticket are blocked. Both stay in todo, flagged human.
// Settings: plans/<slug>/stack.md front matter (path, verify, agent, reset, protected, llm, attempts, timeout).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fail } from './util.mjs';
import { mcp, readStack } from './plan.mjs';

const RUNS = '.factory';
const log = (...a) => console.log(`[${new Date().toLocaleTimeString('en-GB')}]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tail = (s, n) => (s.length > n ? `…\n${s.slice(-n)}` : s);
const list = (s) => (s || '').split(',').map((x) => x.trim()).filter(Boolean);
const finished = (t) => ['review', 'done'].includes(t.status) && !t.tags.some((x) => x === 'skipped' || x === 'blocked');
const depsOf = (text) => [...((text.match(/^- Depends on: (.*)$/m) || [])[1] || '').matchAll(/\bT\d{2,3}\b/g)].map((m) => m[0]);
const stripHowTo = (text) => text.replace(/\n*-{3}\s*\n+### How to work[\s\S]*$/, '').trim();

function settings(slug, flags) {
  const { meta, profile } = readStack(slug);
  const file = `plans/${slug}/stack.md`;
  const dir = (meta.path || fail(`${file}: set \`path\` (where the production repository is checked out) in the front matter.`)).replace(/^~(?=\/|$)/, os.homedir());
  if (!fs.existsSync(path.join(dir, '.git'))) fail(`${file}: path ${dir} is not a git repository.`);
  if (!meta.verify) fail(`${file}: set \`verify\` (one command that lints, type-checks and tests).`);
  if (!meta.agent) fail(`${file}: set \`agent\`, the command that runs the coding agent non-interactively, e.g. \`pi -p --model llama-cpp/ornith\`.`);
  const verifyFile = meta.verify.split(/\s/)[0];
  return {
    slug,
    dir,
    small: profile === 'small',
    project: meta.kanzo || slug,
    verify: meta.verify,
    agent: meta.agent.includes('$FACTORY_PROMPT') ? meta.agent : `${meta.agent} "$FACTORY_PROMPT"`,
    reset: meta.reset || '',
    llm: meta.llm || '',
    protected: [...new Set(['AGENTS.md', ...(/^\.?\.?\//.test(verifyFile) ? [verifyFile.replace(/^\.\//, '')] : []), ...list(meta.protected)])],
    attempts: Number(flags.attempts || meta.attempts || 5),
    timeoutMin: Number(flags.timeout || meta.timeout || 30),
    url: flags.url || 'http://127.0.0.1:4242/mcp',
    once: !!flags.once,
    dry: !!flags['dry-run'],
  };
}

export async function factory(slug, flags = {}) {
  const S = settings(slug, flags);
  const run = (cmd, args, opts = {}) => spawnSync(cmd, args, { cwd: S.dir, encoding: 'utf8', maxBuffer: 64 << 20, ...opts });
  const git = (...args) => { const r = run('git', args); if (r.status !== 0) fail(`git ${args.join(' ')}: ${r.stderr}`); return r.stdout.trim(); };
  const shell = (cmd, env = {}) => run('bash', ['-c', cmd], { env: { ...process.env, NO_COLOR: '1', ...env } });

  // Guards: CRLF checkouts break scripts after every reset; a dirty tree would be committed with the first ticket
  if (run('git', ['config', '--get', 'core.autocrlf']).stdout.trim() === 'true') fail(`${S.dir}: core.autocrlf is true, so resets rewrite line endings. Run \`git -C ${S.dir} config core.autocrlf false\` and add a .gitattributes with \`* text=auto eol=lf\`.`);
  const exclude = path.join(S.dir, '.git/info/exclude');
  if (!fs.readFileSync(exclude, 'utf8').split('\n').includes(`${RUNS}/`)) fs.appendFileSync(exclude, `\n${RUNS}/\n`);
  if (git('status', '--porcelain')) fail(`${S.dir}: the working tree is not clean; commit or stash first.`);

  let tool;
  try { tool = await mcp(S.url); } catch (e) { fail(`Kanzo is not reachable at ${S.url} (${e.cause?.code || e.message}).`); }
  const base = new URL(S.url).origin;
  const getTask = async (id) => (await (await fetch(`${base}/api/tasks/${id}`)).json()).task;
  const ref = (id) => `${S.project}#${id}`;
  const comment = (id, body) => (S.dry ? log(`(dry) comment on ${ref(id)}`) : tool('add_comment', { id: ref(id), author: 'factory', body }));
  const update = (id, fields) => (S.dry ? log(`(dry) update ${ref(id)}`, JSON.stringify(fields)) : tool('update_task', { id: ref(id), ...fields }));
  // "voltcart#5 [todo] T05 · Products table {extra, backend}" → { id, status, key, tags }
  const listTasks = async () => (await tool('list_tasks', { project: S.project, status: 'all' })).split('\n')
    .map((l) => l.match(/^\S+#(\d+) \[(\w+)\] (T\d+) · .*?(?:\{([^}]*)\})?$/)).filter(Boolean)
    .map(([, id, status, key, tags]) => ({ id: Number(id), status, key, tags: list(tags) }));

  const prompt = (task, previous) => [
    'You are implementing exactly one ticket in this repository, on your own: nobody will answer questions.',
    'AGENTS.md describes the stack, the layout and the commands.',
    '', `# Ticket ${task.title}`, '', stripHowTo(task.description), '',
    '# Rules',
    S.small ? '- Read only the files the ticket names and the files they import.' : '',
    '- Mockup paths outside this repository are a visual reference only.',
    `- Never change ${S.protected.map((p) => `\`${p}\``).join(', ')}.`,
    '- Do not run git commands and do not commit: the factory commits for you. Do not use the Kanzo board.',
    '- Keep the change to what the ticket asks for, with the tests it asks for.',
    `- You are done only when \`${S.verify}\` exits 0. Run it, read the errors, fix them, and run it again.`,
    '- Finish with a short summary (3 to 6 lines): files changed and anything left open.',
    previous ? `\n# The previous attempt failed\nThe repository was reset to the state before it. Avoid the same mistake.\n\n${previous}` : '',
  ].filter((l, i, a) => l !== '' || a[i - 1] !== '').join('\n');

  const current = { task: null, base: null, child: null };
  const runAgent = (text, logFile) => new Promise((resolve) => {
    const out = fs.createWriteStream(logFile);
    const child = spawn('bash', ['-c', S.agent], { cwd: S.dir, detached: true, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, FACTORY_PROMPT: text } });
    let buf = '';
    const keep = (d) => { out.write(d); buf = (buf + d).slice(-20000); };
    child.stdout.on('data', keep);
    child.stderr.on('data', keep);
    current.child = child;
    const timer = setTimeout(() => { keep(`\n[factory] timeout after ${S.timeoutMin} min\n`); try { process.kill(-child.pid, 'SIGKILL'); } catch {} }, S.timeoutMin * 60_000);
    child.on('close', (code) => { clearTimeout(timer); current.child = null; out.end(); resolve({ code, output: buf.trim() }); });
  });
  const resetTo = (sha) => {
    git('reset', '--hard', '-q', sha);
    git('clean', '-fdq');
    if (S.reset) shell(S.reset);
  };
  const waitForModel = async () => {
    for (let i = 0; S.llm; i++) {
      try { if ((await fetch(S.llm)).ok) return; } catch {}
      if (i % 10 === 0) log(`model not reachable at ${S.llm}; waiting`);
      await sleep(30_000);
    }
  };

  async function work(task) {
    const key = task.title.split(' ')[0];
    const runDir = path.join(S.dir, RUNS, key);
    fs.mkdirSync(runDir, { recursive: true });
    const sha = git('rev-parse', 'HEAD');
    Object.assign(current, { task, base: sha });
    await update(task.id, { status: 'doing' });
    let previous = '';
    for (let attempt = 1; attempt <= S.attempts; attempt++) {
      await waitForModel();
      log(`${key} attempt ${attempt}/${S.attempts}`);
      const agent = await runAgent(prompt(task, previous), path.join(runDir, `attempt-${attempt}.log`));
      const changed = git('status', '--porcelain').split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '').replace(/^.* -> /, ''));
      const touched = changed.filter((f) => S.protected.some((p) => f === p || (p.endsWith('/') && f.startsWith(p))));
      let reason = '';
      let detail = '';
      if (!changed.length) reason = 'no files changed';
      else if (touched.length) reason = `changed protected files: ${touched.join(', ')}`;
      else {
        const v = shell(S.verify);
        const output = `${v.stdout}\n${v.stderr}`.replace(/\x1b\[[0-9;]*m/g, '');
        fs.writeFileSync(path.join(runDir, `verify-${attempt}.log`), output);
        if (v.status === 0) {
          git('add', '-A');
          git('commit', '-q', '-m', `${key}: ${task.title.replace(/^T\d+ · /, '').slice(0, 64)}`);
          const stat = git('show', '--stat', '--format=%h %s', 'HEAD');
          await comment(task.id, `Done by the factory on attempt ${attempt}/${S.attempts}; \`${S.verify}\` passed.\n\n\`\`\`\n${stat}\n\`\`\`\n\n**Agent summary**\n\n${tail(agent.output, 1500)}`);
          await update(task.id, { status: 'review' });
          log(`${key} ✔ ${stat.split('\n')[0]}`);
          current.task = null;
          return;
        }
        reason = `\`${S.verify}\` failed`;
        detail = tail(output, 5000);
      }
      log(`${key} ✘ attempt ${attempt}: ${reason}`);
      previous = `Reason: ${reason}.${agent.code ? ` The agent exited with code ${agent.code}.` : ''}${detail ? `\n\nLast verify output:\n\`\`\`\n${detail}\n\`\`\`` : ''}\n\nYour final message was:\n${tail(agent.output, 1200)}`;
      await comment(task.id, `Attempt ${attempt}/${S.attempts} failed: ${reason}.${detail ? `\n\n\`\`\`\n${tail(detail, 2500)}\n\`\`\`` : ''}`);
      resetTo(sha);
    }
    current.task = null;
    await update(task.id, { status: 'todo', human: true, tags: [...new Set([...task.tags, 'skipped'])].join(',') });
    await comment(task.id, `Skipped after ${S.attempts} failed attempts. Logs: \`${RUNS}/${key}/\` in the repository. Fix it by hand (or improve the ticket), then clear the human flag and the \`skipped\` tag to hand it back to the factory.`);
    log(`${key} skipped after ${S.attempts} attempts`);
  }

  let stopping = false;
  process.on('SIGINT', async () => {
    if (stopping) process.exit(130);
    stopping = true;
    log('stopping: resetting the attempt in progress');
    if (current.child) { try { process.kill(-current.child.pid, 'SIGKILL'); } catch {} }
    if (current.task) { resetTo(current.base); await update(current.task.id, { status: 'todo' }).catch(() => {}); }
    process.exit(130);
  });

  log(`factory ${S.slug}: board ${S.project}, repo ${S.dir}, ${S.attempts} attempts × ${S.timeoutMin} min${S.dry ? ', dry run' : ''}`);
  let done = 0;
  for (;;) {
    const all = await listTasks();
    const byKey = new Map(all.map((t) => [t.key, t]));
    let next = null;
    for (const t of all.filter((x) => x.status === 'todo')) {
      const task = await getTask(t.id);
      if (task.human) continue;
      const waiting = depsOf(task.description).filter((d) => byKey.has(d) && !finished(byKey.get(d)));
      if (waiting.length) {
        // It stays in todo, so later tickets that depend on it count it as unfinished too
        log(`${t.key} blocked by ${waiting.join(', ')}`);
        await update(t.id, { human: true, tags: [...new Set([...t.tags, 'blocked'])].join(',') });
        await comment(t.id, `Blocked: waits for ${waiting.join(', ')} (skipped, blocked or for a person). Clear the human flag and the \`blocked\` tag when they are finished.`);
        continue;
      }
      next = { ...task, tags: t.tags };
      break;
    }
    if (!next) return `No ticket left for the factory in todo (${done} worked in this run).`;
    if (S.dry) return `Next: ${next.title}`;
    await work(next);
    done++;
    if (S.once) return `Stopped after one ticket (--once).`;
  }
}
