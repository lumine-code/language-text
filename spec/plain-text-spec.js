describe("Plain Text grammar", () => {
  let grammar = null;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-log");
    await lumine.packages.activatePackage("language-text");

    grammar = lumine.grammars.grammarForScopeName("text.plain");
  });

  it("parses the grammar", () => {
    expect(grammar).toBeTruthy();
    expect(grammar.scopeName).toBe("text.plain");
    expect(grammar.type).toBe("tree-sitter");
  });

  it("preserves the standard plain-text paragraph scope", async () => {
    const editor = await lumine.workspace.open();
    editor.setGrammar(grammar);
    editor.setText("Plain text paragraph.\n");
    await editor.languageMode.ready;

    expect(editor.scopeDescriptorForBufferPosition([0, 0]).getScopesArray()).toContain(
      "meta.paragraph.text",
    );
  });
});
