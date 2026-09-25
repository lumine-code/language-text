describe("Plain Text grammar", () => {
  let grammar = null;

  beforeEach(async () => {
    await lumine.packages.activatePackage("language-todo");
    await lumine.packages.activatePackage("language-text");

    grammar = lumine.grammars.grammarForScopeName("text.plain");
  });

  it("parses the grammar", () => {
    expect(grammar).toBeTruthy();
    expect(grammar.scopeName).toBe("text.plain");
    expect(grammar.type).toBe("tree-sitter");
    expect(grammar.packageName).toBe("language-text");
    expect(grammar.injectionNames).toEqual(["text", "plain", "plaintext"]);
  });

  async function parse(text) {
    const editor = await lumine.workspace.open();
    editor.setGrammar(grammar);
    editor.setText(text);
    await editor.languageMode.ready;
    await editor.languageMode.atTransactionEnd();
    expect(editor.languageMode.tree.rootNode.hasError).toBe(false);
    return editor;
  }

  it("builds paragraph and line nodes for plain text", async () => {
    const editor = await parse("first\nsecond\n\nthird\n\t \nfourth");
    expect(editor.languageMode.tree.rootNode.toString()).toBe(
      "(document (paragraph (line) (line)) (paragraph (line)) (paragraph (line)))",
    );
  });

  it("accepts empty text, whitespace, Unicode, punctuation, and every line ending", async () => {
    const cases = [
      ["", "(document)"],
      [" \t ", "(document)"],
      ["Zażółć gęślą jaźń 🙂 — []{}() / \\ \" ' …", "(document (paragraph (line)))"],
      ["first\r\nsecond\r\n\r\nthird\r\n", null],
      ["first\rsecond\r\rthird\r", null],
    ];
    for (const [text, expectedTree] of cases) {
      const editor = await parse(text);
      if (expectedTree) expect(editor.languageMode.tree.rootNode.toString()).toBe(expectedTree);
    }
  });

  it("parses a very long line without errors", async () => {
    const editor = await parse("plain text ".repeat(100000));
    expect(editor.languageMode.tree.rootNode.toString()).toBe("(document (paragraph (line)))");
  });

  it("preserves the standard plain-text paragraph scope", async () => {
    const editor = await parse("Plain text paragraph.\n");

    expect(editor.scopeDescriptorForBufferPosition([0, 0]).getScopesArray()).toContain(
      "meta.paragraph.text",
    );
  });

  it("hosts TODO injections only at word boundaries", async () => {
    const editor = await parse("TODO fix this\nxTODO\nTODOs\nsubTODO\n");
    await conditionPromise(() =>
      editor
        .scopeDescriptorForBufferPosition([0, 0])
        .getScopesArray()
        .includes("storage.type.class.todo"),
    );

    expect(editor.scopeDescriptorForBufferPosition([0, 0]).getScopesArray()).toContain(
      "storage.type.class.todo",
    );
    for (const row of [1, 2, 3]) {
      expect(editor.scopeDescriptorForBufferPosition([row, 0]).getScopesArray()).not.toContain(
        "storage.type.class.todo",
      );
    }
  });
});
