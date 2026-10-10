const fs = require("fs");
const path = require("path");

const packagePath = (name) => {
  const sibling = path.resolve(__dirname, "..", "..", name);
  return fs.existsSync(sibling) ? sibling : name;
};

describe("Plain Text without injections", () => {
  let editor;

  beforeEach(async () => {
    await lumine.packages.activatePackage(packagePath("language-text"));
    await lumine.packages.activatePackage(packagePath("language-todo"));
  });

  afterEach(() => editor?.destroy());

  it("keeps annotation markers and links plain with their grammars loaded", async () => {
    await lumine.packages.activatePackage(packagePath("language-hyperlink"));
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("text.plain"));
    editor.setText(
      "ordinary prose\nTODO finish this line\nFIXME CHANGED XXX IDEA HACK NOTE REVIEW NB BUG QUESTION COMBAK TEMP DEBUG OPTIMIZE WARNING\nhttps://example.com\n",
    );
    await editor.whenGrammarSettled();
    expect(editor.languageMode.getAllInjectionLayers()).toEqual([]);
    for (const row of [0, 1, 2, 3]) {
      expect(editor.scopeDescriptorForBufferPosition([row, 0]).getScopesArray()).toEqual([
        "text.plain",
        "meta.paragraph.text",
      ]);
    }

    editor.setTextInBufferRange(
      [
        [0, 0],
        [0, 0],
      ],
      "TODO https://example.com\n",
    );
    await editor.whenGrammarSettled();
    expect(editor.languageMode.getAllInjectionLayers()).toEqual([]);
    expect(editor.scopeDescriptorForBufferPosition([0, 0]).getScopesArray()).toEqual([
      "text.plain",
      "meta.paragraph.text",
    ]);
  });
});
