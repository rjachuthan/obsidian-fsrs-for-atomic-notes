# Community Plugin Submission

Use this checklist and PR template when submitting the plugin to the Obsidian community plugins directory.

## Pre-submission checklist

From [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin):

- [ ] Plugin ID is unique and follows conventions (`obsidian-fsrs-atomic`)
- [ ] Plugin name is clear and descriptive
- [ ] Description is concise (&lt; 250 chars)
- [ ] `authorUrl` in manifest (e.g. GitHub profile or repo)
- [ ] README has clear installation instructions
- [ ] No obfuscated code
- [ ] No external network calls without user consent
- [ ] Follows Obsidian's security guidelines
- [ ] Works on both desktop and mobile (or marked desktop-only)
- [ ] Tested on latest Obsidian version

## Release artifacts

Built output (e.g. from `npm run build`) should include:

```
(plugin folder)
├── main.js
├── manifest.json
├── styles.css
└── (optional) data template or extra assets
```

See [Obsidian: Submit your plugin](https://docs.obsidian.md/Plugins/Releasing/Submit+your+plugin) for the exact submission process and repo layout.

## Pull request template (obsidian-releases)

```markdown
## Community Plugin Submission

**Plugin name**: FSRS for Atomic Notes  
**Plugin ID**: obsidian-fsrs-atomic  
**Repository**: https://github.com/rituraj/obsidian-fsrs-for-atomic-notes

### Description

Spaced repetition for atomic notes using the FSRS algorithm. Maintains complete separation between notes and scheduling metadata.

### Checklist

- [ ] I have tested my plugin on Windows, macOS, and mobile
- [ ] I have included a README with installation instructions
- [ ] My plugin follows the developer policies
- [ ] I have not included any analytics or tracking
- [ ] My plugin does not make network requests (or I have disclosed them)

### Screenshots

(Attach screenshots of main features: sidebar, dashboard, settings)
```

## Version and release

- Set final version (e.g. `1.0.0`) in `manifest.json`
- Create a GitHub release whose tag exactly matches the version (no leading `v`)
- Attach `manifest.json`, `main.js`, and `styles.css` to the release
- Submit PR to [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) with the template above
