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
    expect(
      editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.type === "document").hasError,
    ).toBe(false);
    return editor;
  }

  function expectDocumentShape(editor, lineCounts) {
    const root = editor.languageMode.tree.rootNode;
    expect(root.type).toBe("document");
    expect(root.namedChildren.map((node) => node.type)).toEqual(lineCounts.map(() => "paragraph"));
    expect(
      root.namedChildren.map((paragraph) => paragraph.namedChildren.map((node) => node.type)),
    ).toEqual(lineCounts.map((count) => Array(count).fill("line")));
  }

  it("builds paragraph and line nodes for plain text", async () => {
    const editor = await parse("first\nsecond\n\nthird\n\t \nfourth");
    expectDocumentShape(editor, [2, 1, 1]);
  });

  it("accepts empty text, whitespace, Unicode, punctuation, and every line ending", async () => {
    const cases = [
      ["", []],
      [" \t ", []],
      ["Zażółć gęślą jaźń 🙂 — []{}() / \\ \" ' …", [1]],
      ["first\r\nsecond\r\n\r\nthird\r\n", [2, 1]],
      ["first\rsecond\r\rthird\r", [2, 1]],
    ];
    for (const [text, lineCounts] of cases) {
      const editor = await parse(text);
      expectDocumentShape(editor, lineCounts);
    }
  });

  it("parses a very long line without errors", async () => {
    const editor = await parse("plain text ".repeat(100000));
    expectDocumentShape(editor, [1]);
  });

  it("preserves paragraph nodes and scopes when appending past hidden line groups", async () => {
    const editor = await parse("paragraph line\n".repeat(129));
    expectDocumentShape(editor, [129]);

    editor.setCursorBufferPosition(editor.getBuffer().getEndPosition());
    editor.insertText("last line");
    await editor.languageMode.atTransactionEnd();

    expectDocumentShape(editor, [130]);
    expect(editor.scopeDescriptorForBufferPosition([129, 0]).getScopesArray()).toContain(
      "meta.paragraph.text",
    );
    expect(
      editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.type === "document").hasError,
    ).toBe(false);
  });

  it("preserves the standard plain-text paragraph scope", async () => {
    const editor = await parse("Plain text paragraph.\n");

    expect(editor.scopeDescriptorForBufferPosition([0, 0]).getScopesArray()).toContain(
      "meta.paragraph.text",
    );
  });

  it("preserves paragraph boundaries and scopes across hidden document groups", async () => {
    const count = 129;
    const editor = await parse("paragraph\n\n".repeat(count));
    expectDocumentShape(editor, Array(count).fill(1));
    for (const index of [0, 64, count - 1]) {
      editor.getBuffer().setTextInRange(
        [
          [index * 2, 0],
          [index * 2, 1],
        ],
        "P",
      );
      await editor.languageMode.atTransactionEnd();
      expectDocumentShape(editor, Array(count).fill(1));
      expect(editor.scopeDescriptorForBufferPosition([index * 2, 0]).getScopesArray()).toContain(
        "meta.paragraph.text",
      );
    }
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
