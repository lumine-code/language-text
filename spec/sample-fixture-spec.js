const path = require("path");

describe("Plain Text sample fixture", () => {
  beforeEach(async () => {
    await lumine.packages.activatePackage("language-todo");
    await lumine.packages.activatePackage("language-text");
  });

  it("parses prose without injecting annotation or link grammars", async () => {
    const editor = await lumine.workspace.open(path.join(__dirname, "fixtures", "sample.txt"));
    const languageMode = editor.getBuffer().getLanguageMode();
    await languageMode.ready;
    await editor.whenGrammarSettled();

    expect(editor.getGrammar().scopeName).toBe("text.plain");
    expect(
      editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.type === "document").hasError,
    ).toBe(false);
    expect(languageMode.getAllInjectionLayers()).toEqual([]);
    expect(editor.scopeDescriptorForBufferPosition([4, 0]).getScopesArray()).toEqual([
      "text.plain",
      "meta.paragraph.text",
    ]);
  });
});
