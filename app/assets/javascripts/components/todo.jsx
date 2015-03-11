window.loadToDo = function() {
  window.React = React;

  var constants = {
    LOAD_TODO: "LOAD_TODO",
    LOAD_TODO_SUCCESS: "LOAD_TODO_SUCCESS",
    LOAD_TODO_FAIL: "LOAD_TODO_FAIL",

    ADD_TODO: "ADD_TODO",
    ADD_TODO_SUCCESS: "ADD_TODO_SUCCESS",
    ADD_TODO_FAIL: "ADD_TODO_FAIL",

    TOGGLE_TODO: "TOGGLE_TODO",

    CLEAR_TODOS: "CLEAR_TODOS",
    CLEAR_TODOS_SUCCESS: "CLEAR_TODOS_SUCCESS",
    CLEAR_TODOS_FAIL: "CLEAR_TODOS_FAIL",
  };

  var TodoStore = Fluxxor.createStore({
    initialize: function() {
      this.loading = false;
      this.error = null;
      this.todos = [];

      this.bindActions(
        constants.LOAD_TODO, this.onloadTodo,
        constants.LOAD_TODO_SUCCESS, this.onloadTodoSuccess,
        constants.LOAD_TODO_FAIL, this.onloadTodoFail,

        constants.ADD_TODO, this.onAddTodo,
        constants.ADD_TODO_SUCCESS, this.onAddTodoSuccess,
        constants.ADD_TODO_FAIL, this.onAddTodoFail,

        constants.TOGGLE_TODO, this.onToggleTodo,

        constants.CLEAR_TODOS, this.onClearTodos,
        constants.CLEAR_TODOS_SUCCESS, this.onClearTodosSuccess,
        constants.CLEAR_TODOS_FAIL, this.onClearTodosFail
      );
    },

    onloadTodo: function() {
      this.loading = true;
      this.emit("change");
    },

    onloadTodoSuccess: function(payload) {
      this.loading = false;
      this.error = null;

      this.todos = payload.todos;
      this.emit("change");
    },

    onloadTodoFail: function(payload) {
      this.loading = false;
      this.error = payload.error;
      this.emit("change");
    },

    onAddTodo: function(payload) {
      this.todos.push({text: payload.text, completed: false});
      this.emit("change");
    },

    onAddTodoSuccess: function(payload) {
      // todo
      this.emit("change");
    },

    onAddTodoFail: function(payload) {
      // todo
      this.emit("change");
    },

    onToggleTodo: function(payload) {
      payload.todo.completed = !payload.todo.completed;
      this.emit("change");
    },

    onClearTodos: function() {
      this.todos = this.todos.filter(function(todo) {
        return !todo.completed;
      });
      this.emit("change");
    },

    onClearTodosSuccess: function(payload) {
      // set atrributes for this.todos
      this.emit("change");
    },

    onClearTodosFail: function(payload) {
      // todo
      this.emit("change");
    },

    getState: function() {
      return {
        todos: this.todos
      };
    }
  });

  var actions = {
    loadTodo: function() {
      this.dispatch(constants.LOAD_TODO);

      $.ajax({
        url: 'todos.json',
        dataType: 'json',
        success: function(data) {
          this.dispatch(constants.LOAD_TODO_SUCCESS, {todos: data});
        }.bind(this),
        error: function(xhr, status, err) {
          this.dispatch(constants.LOAD_TODO_FAIL, {error: err.toString()});
        }.bind(this)
      });
    },

    addTodo: function(text) {
      this.dispatch(constants.ADD_TODO, {text: text});
      var todo = {text: text, completed: false};

      $.ajax({
        url: 'todos.json',
        dataType: 'json',
        type: 'POST',
        data: { todo: todo },
        success: function(data) {
          this.dispatch(constants.ADD_TODO_SUCCESS, {todo: data});
        }.bind(this),
        error: function(xhr, status, err) {
          this.dispatch(constants.ADD_TODO_FAIL, {error: err.toString()});
        }.bind(this)
      });
    },

    toggleTodo: function(todo) {
      this.dispatch(constants.TOGGLE_TODO, {todo: todo});
    },

    clearTodos: function(todos) {
      this.dispatch(constants.CLEAR_TODOS);

      $.each(todos, function( index, todo ) {
        if (todo.completed) {
          console.log(todo);
          $.ajax({
            type: 'DELETE',
            contentType: 'json',
            url: 'todos/' + todo.id + '.json',
            success: function(data) {
              this.dispatch(constants.CLEAR_TODOS_SUCCESS, {todo: data});
            }.bind(this),
            error: function(xhr, status, err) {
              this.dispatch(constants.CLEAR_TODOS_FAIL, {error: err.toString()});
            }.bind(this)
          });
        }
      });
    }
  };

  var stores = {
    TodoStore: new TodoStore()
  };

  var flux = new Fluxxor.Flux(stores, actions);

  window.flux = flux;

  flux.on("dispatch", function(type, payload) {
    if (console && console.log) {
      console.log("[Dispatch]", type, payload);
    }
  });

  var FluxMixin = Fluxxor.FluxMixin(React),
      StoreWatchMixin = Fluxxor.StoreWatchMixin;

  var Application = React.createClass({
    mixins: [FluxMixin, StoreWatchMixin("TodoStore")],

    getInitialState: function() {
      return { newTodoText: "" };
    },

    getStateFromFlux: function() {
      var store = this.getFlux().store("TodoStore");
      return {
        loading: store.loading,
        error: store.error,
        todos: store.todos
      };
    },

    render: function() {
      return (
        <div>
          <ul>
            {this.state.todos.map(function(todo, i) {
              return <li key={i}><TodoItem todo={todo} /></li>;
            })}
          </ul>
          <form onSubmit={this.onSubmitForm}>
            <input type="text" size="30" placeholder="New Todo"
                   value={this.state.newTodoText}
                   onChange={this.handleTodoTextChange} />
            <input type="submit" value="Add Todo" />
          </form>
          <button onClick={this.clearCompletedTodos}>Clear Completed</button>
        </div>
      );
    },

    componentDidMount: function() {
      this.getFlux().actions.loadTodo();
    },

    handleTodoTextChange: function(e) {
      this.setState({newTodoText: e.target.value});
    },

    onSubmitForm: function(e) {
      e.preventDefault();
      if (this.state.newTodoText.trim()) {
        this.getFlux().actions.addTodo(this.state.newTodoText);
        this.setState({newTodoText: ""});
      }
    },

    clearCompletedTodos: function(e) {
      this.getFlux().actions.clearTodos(this.state.todos);
    }
  });

  var TodoItem = React.createClass({
    mixins: [FluxMixin],

    propTypes: {
      todo: React.PropTypes.object.isRequired
    },

    render: function() {
      var style = {
        textDecoration: this.props.todo.completed ? "line-through" : ""
      };

      return <span style={style} onClick={this.onClick}>{this.props.todo.text}</span>;
    },

    onClick: function() {
      this.getFlux().actions.toggleTodo(this.props.todo);
    }
  });

  React.render(<Application flux={flux} />, document.getElementById("app"));
}
