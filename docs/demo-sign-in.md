# The demo sign-in

The demo sites let people sign in with the shared account `trio_demo`, without an email code. Two Worker secrets make it
work. Neither is in this repository.

| Secret | What it holds | Where |
| --- | --- | --- |
| `DEMO_LOGIN` | The account: `[{"username": "trio_demo", "email": "demo@triodian.com", "hash": "...", "anyCharAt": [3]}]`. The password is held only as a PBKDF2 hash. | The live and test Worker of each engagement app |
| `DEMO_SESSION_KEY` | The key that signs the demo cookie, shared across triodian.com | The same value in every app |

Client deployments set neither: they have no demo sign-in.

## Making the hash and setting it

The hash was public in this repository's history before it became a secret, so the password must be changed when it
moves. In a checkout of any of the four engagement apps, make the new hash (the password is typed at the prompt and
not stored):

```
node -e "import('./lib/identity/session.js').then(async m => { const rl = (await import('node:readline/promises')).createInterface({ input: process.stdin, output: process.stdout }); const p = await rl.question('New trio_demo password: '); rl.close(); console.log(JSON.stringify([{ username: 'trio_demo', email: 'demo@triodian.com', hash: await m.hashPassword(p) }])); })"
```

Then set the printed value as the secret on each Worker, after the change that removes it from `wrangler.jsonc` has
deployed (a Worker cannot hold a variable and a secret with the same name):

```
npx wrangler secret put DEMO_LOGIN                # live
npx wrangler secret put DEMO_LOGIN --env test     # test site
```

Until it is set, the demo sign-in on that site says the username or password is wrong; email sign-in is unaffected.
`anyCharAt` (optional) lists character positions where any character is accepted, for a password with a character
that is not on every keyboard; the hash is then made with `maskPassword()` applied first.
