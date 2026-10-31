#!/usr/bin/env node
// protokit CLI (Node.js 18+, no dependencies). Run `node scripts/pk.mjs help`.
import { Fail, fail, read } from './lib/util.mjs';

const USAGE = `protokit · node scripts/pk.mjs <command>   (or: npm run pk -- <command>)

  brief <slug>                 validate briefs/<slug>.md
  init <slug>                  create projects/<slug>/ from its Ready brief
  context <slug> <n>           print what an assistant needs to build module n
  handoff <slug> [n]           print the implementation spec: foundation, or module n
  plan <slug>                  generate plans/<slug>/tickets.md from stack.md and the mockup
  plan push <slug>             create the tickets on the Kanzo board (--update, --dry-run, --url <mcp url>)
  check [slug]                 repository checks; must pass before every commit
  serve [slug]                 local server with live reload and docs (--port <n>, --no-open, --no-live); also: npm start
  sync                         regenerate derived files: agent adapters, hub/site.js, shared project files
  agents [list|add|remove] …   which AI tools get adapters (claude, codex, opencode, pi, gemini, cursor, copilot)
  kit update [--from <src>]    update the kit files from upstream protokit (path or git URL)`;

const argv = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a.startsWith('--')) {
    const [k, v] = a.slice(2).split('=');
    flags[k] = v ?? (argv[i + 1] && !argv[i + 1].startsWith('--') && ['port', 'url', 'from'].includes(k) ? argv[++i] : true);
  } else args.push(a);
}
const [cmd, ...rest] = args;

async function main() {
  switch (cmd) {
    case 'brief': {
      const { parseBrief, checkBrief } = await import('./lib/brief.mjs');
      const b = parseBrief(rest[0]);
      return `${b.file}: OK, ${checkBrief(b)}.`;
    }
    case 'init': {
      const { initProject } = await import('./lib/brief.mjs');
      const { syncAll } = await import('./lib/sync.mjs');
      const out = initProject(rest[0]);
      syncAll();
      return `${out}\nUpdated hub/site.js. Next: build the foundation (/pk-init), then /pk-build ${rest[0]} 1.`;
    }
    case 'context': {
      const { moduleContext } = await import('./lib/brief.mjs');
      return moduleContext(rest[0], rest[1]);
    }
    case 'handoff': {
      const { handoff } = await import('./lib/brief.mjs');
      return handoff(rest[0], rest[1]);
    }
    case 'plan': {
      const plan = await import('./lib/plan.mjs');
      if (rest[0] === 'push') return plan.pushPlan(rest[1] || fail(USAGE), { url: flags.url, update: !!flags.update, dry: !!flags['dry-run'] });
      return plan.writePlan(rest[0] || fail(USAGE));
    }
    case 'check': {
      const { check } = await import('./lib/check.mjs');
      process.exitCode = check(rest[0]) ? 1 : 0;
      return '';
    }
    case 'serve': {
      const { serve } = await import('./lib/serve.mjs');
      serve(rest[0], { port: Number(flags.port) || 3000, open: !flags['no-open'], live: !flags['no-live'] });
      return '';
    }
    case 'sync': {
      const { syncAll } = await import('./lib/sync.mjs');
      const changed = syncAll();
      return changed.length ? `Updated:\n${changed.map((f) => `  ${f}`).join('\n')}` : 'Everything is up to date.';
    }
    case 'agents': {
      const { TOOLS, enabledTools, setAgents, syncAll } = await import('./lib/sync.mjs');
      const [sub = 'list', ...names] = rest;
      const on = enabledTools();
      if (sub === 'list') return Object.entries(TOOLS).map(([k, t]) => `${on.includes(k) ? '●' : '○'} ${k.padEnd(9)} ${t.name}`).join('\n');
      for (const n of names) if (!TOOLS[n]) fail(`Unknown tool '${n}'. Known: ${Object.keys(TOOLS).join(', ')}.`);
      if (!names.length) fail('Name at least one tool.');
      const next = sub === 'add' ? [...new Set([...on, ...names])] : sub === 'remove' ? on.filter((t) => !names.includes(t)) : fail(USAGE);
      setAgents(next);
      const changed = syncAll();
      return `Agents: ${next.join(', ') || '(none)'}.${changed.length ? `\n${changed.map((f) => `  ${f}`).join('\n')}` : ''}`;
    }
    case 'kit': {
      if (rest[0] !== 'update') fail(USAGE);
      const { kitUpdate } = await import('./lib/kit.mjs');
      return kitUpdate(flags.from);
    }
    case 'version': return `protokit ${JSON.parse(read('package.json')).version}`;
    case undefined: case 'help': case '-h': return USAGE;
    default: fail(`Unknown command '${cmd}'.\n\n${USAGE}`);
  }
}

main().then((out) => { if (out) console.log(out); }).catch((e) => {
  console.error(e instanceof Fail ? e.message : e.stack || e);
  process.exit(1);
});
