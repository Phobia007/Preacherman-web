# Login panel design QA

- Reference: `/Users/zari/Desktop/截屏2026-08-05 19.33.13.png`
- Prototype: `/Users/zari/Documents/终极官网/index.html`
- Target viewport: 1117 × 755
- State to compare: click `Log in` and keep the login panel open

## Checks completed

- Login form structure matches the reference hierarchy: email, password, session options, primary submit, sign-up prompt, and a centered Google provider button.
- The Apple provider was removed and the supplied Remix Icon `google-line` asset was extracted into a standalone SVG and placed before the Google label.
- The panel uses the site's existing warm background, serif typography, hairline borders, and raised-shadow treatment.
- Desktop and mobile placement rules are present.
- Keyboard Escape, outside click, password visibility, native validation, and English/Chinese copy are implemented.
- JavaScript syntax, localization-key coverage, and whitespace checks pass.

## Visual comparison

The in-app browser did not permit automated inspection of this local `file://` page, so a same-viewport implementation screenshot could not be captured for side-by-side comparison.

Final result: blocked
