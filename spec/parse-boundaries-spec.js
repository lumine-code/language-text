const path = require("node:path");

describe("Plain Text parse boundaries in the editor", () => {
  let editor;

  beforeEach(async () => {
    jasmine.useRealClock();
    for (const name of ["language-text", "language-todo", "language-javascript"]) {
      await lumine.packages.activatePackage(path.resolve(__dirname, "..", "..", name));
    }
  });

  afterEach(() => editor?.destroy());

  const scopesAt = (point) => editor.scopeDescriptorForBufferPosition(point).getScopesArray();

  async function editWithCounters(layer, range) {
    const mode = editor.getBuffer().getLanguageMode();
    const parser = mode.getOrCreateParserForLanguage(layer.language);
    let steps = 0,
      consumed = 0;
    parser.setLogger((message) => {
      if (message.startsWith("process ")) steps++;
      if (message.startsWith("consume ")) consumed++;
    });
    const calls = [];
    const original = mode.parseAsync.bind(mode);
    const spy = spyOn(mode, "parseAsync").and.callFake((language, oldTree, ranges, options) => {
      if (language === layer.language && oldTree) calls.push(ranges);
      return original(language, oldTree, ranges, options);
    });
    try {
      editor.setTextInBufferRange(range, "\n");
      await editor.whenGrammarSettled();
    } finally {
      parser.setLogger(null);
      spy.and.callThrough();
    }
    expect(steps).toBeLessThan(4096);
    expect(consumed).toBeLessThan(8192);
    expect(calls.length).toBeGreaterThan(0);
    const hints = calls.at(-1);
    expect(hints.length).toBeGreaterThan(1);
    for (let index = 1; index < hints.length; index++) {
      expect(hints[index - 1].endIndex).toBe(hints[index].startIndex);
    }
    expect(layer.tree.rootNode.hasError).toBe(false);
    return hints;
  }

  it("keeps the first Enter local in a 1 MiB paragraph and retains TODO scopes", async () => {
    const rows = Math.ceil(1048576 / 5);
    const body = `${"line\n".repeat(rows)}TODO retained\n`;
    editor = await lumine.workspace.open();
    editor.setGrammar(lumine.grammars.grammarForScopeName("text.plain"));
    editor.setText(body);
    await editor.whenGrammarSettled();
    const layer = editor.languageMode.rootLanguageLayer;
    expect(layer.queries.parseBoundariesQuery).toBeDefined();
    expect(scopesAt([rows, 0])).toContain("storage.type.class.todo");

    const hints = await editWithCounters(layer, [
      [0, 2],
      [0, 2],
    ]);
    expect(hints[0].startIndex).toBe(0);
    expect(hints.at(-1).endIndex).toBe(2147483647);
    const root = editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => !node.parent);
    expect(root.endIndex).toBe(body.length + 1);
    expect(root.descendantsOfType("paragraph").length).toBe(1);
    expect(editor.getSyntaxNodeAtBufferPosition([0, 0], (node) => node.type === "line").text).toBe(
      "li",
    );
    expect(editor.getSyntaxNodeAtBufferPosition([1, 0], (node) => node.type === "line").text).toBe(
      "ne",
    );
    expect(scopesAt([0, 0])).toContain("meta.paragraph.text");
    expect(scopesAt([rows + 1, 0])).toContain("storage.type.class.todo");
  }, 60000);

  it("loads boundaries in an injected plain body without splitting semantic ownership", async () => {
    const rows = Math.ceil(1048576 / 5);
    const body = "line\n".repeat(rows);
    const prefix = "const value = `";
    const host = lumine.grammars.grammarForScopeName("source.js");
    const registration = lumine.grammars.addInjectionPoint("source.js", {
      type: "template_string",
      language: () => "plain",
      content: (node) => node.descendantsOfType("string_fragment"),
      includeChildren: true,
      coverShallowerScopes: true,
    });
    try {
      editor = await lumine.workspace.open();
      editor.setGrammar(host);
      editor.setText(`${prefix}${body}\`;\n`);
      await editor.whenGrammarSettled();
      const mode = editor.getBuffer().getLanguageMode();
      let layer = mode
        .getAllInjectionLayers()
        .find((item) => item.grammar.scopeName === "text.plain");
      expect(layer).toBeDefined();
      expect(layer.depth).toBe(1);
      expect(layer.queries.parseBoundariesQuery).toBeDefined();
      expect(layer.requestedQueryTypes.has("parseBoundariesQuery")).toBe(true);
      expect(layer.getCurrentRanges().length).toBe(1);
      expect(editor.getTextInBufferRange(layer.getCurrentRanges()[0])).toBe(body);

      const hints = await editWithCounters(layer, [
        [0, prefix.length + 2],
        [0, prefix.length + 2],
      ]);
      layer = mode.getAllInjectionLayers().find((item) => item.grammar.scopeName === "text.plain");
      const updated = `li\nne${body.slice(4)}`;
      expect(hints[0].startIndex).toBe(prefix.length);
      expect(hints.at(-1).endIndex).toBe(prefix.length + updated.length);
      expect(layer.getCurrentRanges().length).toBe(1);
      expect(editor.getTextInBufferRange(layer.getCurrentRanges()[0])).toBe(updated);
      expect(layer.tree.rootNode.descendantsOfType("paragraph").length).toBe(1);
      expect(scopesAt([0, 0])).not.toContain("meta.paragraph.text");
      expect(scopesAt([1, 0])).toContain("meta.paragraph.text");
      expect(scopesAt([rows + 1, 0])).not.toContain("meta.paragraph.text");
    } finally {
      registration.dispose();
    }
  }, 60000);
});
