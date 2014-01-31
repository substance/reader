# Substance Reader

The Substance Reader is an integral part of the Substance technology stack used for displaying Substance Documents on digital devices.

![](http://f.cl.ly/items/3Q0s053U0l3z2x0D241t/Screen%20Shot%202014-01-30%20at%2010.37.56.png)

## Using the Reader

### The manual way

Just take the contents from the `dist` folder, and replace the data folder with your own document's content.

### Using the Substance Publisher command line utility.

You can read Substance Documents (`.sdf` archives) or JSON files representing the Substance Document Format.

```bash
$ substance-publish my-essay.sdf <target-folder>
```

Or feed it some markdown. Requires Pandoc to be installed.

```bash
$ substance-publish my-essay.md <target-folder>
```

### License

Substance Reader is released under GPLv3. For commercial licenses please send an inquiry to info@substance.io.

*The Substance Reader has been extracted as an independent module from an [eLife Lens](http://lens.elifesciences.org), an innovate display method for scientific content.*