exports.consumeTodoInjection = (todo) => {
  return todo.addInjectionPoint("text.plain", { types: ["line"] });
};
