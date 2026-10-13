# workin'

A skill and UI ingredients for a personal work journal.

Your agent gathers the work, connects the moments, and builds your version. Workin provides guidance and an iMessage-inspired timeline with original Slack messages, pull requests, posts, documents, and media.

## Give it to your agent

> Read SKILL.md and build me a local work journal using these components. Use my existing connections, start with one day, and keep everything private. Store the full evidence and media locally so we can revisit and regroup it without fetching it again.

The skill works from the repository root. Keep its references and UI alongside it when copying it into your agent's skills directory. It is also fine to point your agent directly at this folder.

## The ingredients

```text
workin/
├── SKILL.md          Where your agent starts
├── references/       Gathering and curation guidance
└── ui/
    ├── components/   Bubbles, source cards, threads, media, stacks
    ├── styles.css    The visual treatment
    ├── index.js      Public component exports
    ├── index.d.ts    The display-data contract
    └── example/      A small, entirely fictional journal
```

- **Guidance:** gather full evidence, recognize meaningful work, and connect related moments.
- **UI:** use the complete timeline or compose the individual components.
- **Your agent:** chooses local storage, uses its existing connections, and wires up the application.

Everything in the UI is plain JavaScript and CSS. No dependencies or build step. See the [UI guide](ui/README.md) for the short integration example.

## Keep the memory

Original evidence, cached media, collection progress, saved curation, and temporary views have different jobs. Keep them separately in private local storage. A request to change the timeframe or level of detail should read what is already there. Refreshes fetch missing or changed activity and resume partial work.

The components display supplied data. They do not connect to providers, run a model, or persist a journal. Those pieces belong to the application your agent builds. Read [gathering](references/gathering.md) for storage and refresh guidance, and [curation](references/curation.md) for the editorial approach.

## See the example

From this directory, serve the files locally:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Open [the example](http://127.0.0.1:8000/ui/example/). Switch between Detailed and Highlights, open a thread, and expand the source cards. All people, work, links, and media in the example are fictional. No accounts are needed.

## Make it yours

Add a source card, change the presentation, or bring the components into an existing project. Preserve original evidence and keep personal records, credentials, downloaded media, and user preferences outside this repository. The example data is a display fixture, not a storage format.

Icon attribution is in [ui/ICON-LICENSES.txt](ui/ICON-LICENSES.txt).
