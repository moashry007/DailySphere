// todo.js

import { el, qs } from './ui.js';

let todos = JSON.parse(localStorage.getItem("todos") || "[]");
let todoContainer;

function saveAndRender() {
  localStorage.setItem("todos", JSON.stringify(todos));
  renderTodos();
}

function renderTodos() {
  if (!todoContainer) return;
  const todoList = qs("#todoList", todoContainer);
  todoList.innerHTML = "";
  if (todos.length === 0) {
    todoList.innerHTML = `<li class="empty-state">No tasks yet. Add one above!</li>`;
    return;
  }
  todos.forEach((todo, index) => {
    const li = document.createElement("li");
    if (todo.done) li.classList.add("done");
    li.innerHTML = `
      <span>${todo.text}</span>
      <div>
        <button class="toggle-done-btn" data-index="${index}">✔</button>
        <button class="delete-btn" data-index="${index}">🗑</button>
      </div>`;
    todoList.appendChild(li);
  });
}

function addTodo(text) {
  todos.push({ text, done: false });
  saveAndRender();
}

function toggleDone(index) {
  if (todos[index]) {
    todos[index].done = !todos[index].done;
    saveAndRender();
  }
}

function deleteTodo(index) {
  todos.splice(index, 1);
  saveAndRender();
}

export function initTodo(container) {
  if (!container) return;
  todoContainer = container;

  todoContainer.innerHTML = `
    <h1>✅ To-Do</h1>
    <div class="form-group"><input id="todoInput" placeholder="Add a new task and press Enter" /></div>
    <ul id="todoList"></ul>
  `;

  const todoInput = qs("#todoInput", todoContainer);
  const todoList = qs("#todoList", todoContainer);

  todoInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && todoInput.value.trim() !== "") {
      addTodo(todoInput.value.trim());
      todoInput.value = "";
    }
  });

  todoList.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const index = parseInt(btn.dataset.index, 10);
    if (btn.classList.contains("toggle-done-btn")) {
      toggleDone(index);
    } else if (btn.classList.contains("delete-btn")) {
      deleteTodo(index);
    }
  });

  renderTodos();
}