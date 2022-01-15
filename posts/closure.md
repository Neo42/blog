---
title: 'How Closures Work'
excerpt: 'Closures are not easy to grasp, but it ain’t impossible. We, as learners, have to understand that, 99% of the time, a concept is always built upon others. We have to figure out how all those dots are connected. Who’s first, who’s next. It’s usually a good approach to trace what you don’t understand in reverse. Start with the definition, break it, and repeat it on every small part. And here, we are gonna do this on closures.'
coverImage: '/assets/blog/dynamic-routing/cover.jpg'
date: '2020-06-19'
author:
  name: Hao Jiang
  picture: '/assets/blog/authors/hao.png'
ogImage:
  url: '/assets/blog/closure/cover.jpg'
---

_EDIT: This post is written years ago when I was just starting my functional programming and JavaScript learning. So there are probably quite a number of mistakes and it's recommended not to fully believe what I said in this one. I'll rewrite this post, just to correct myself, someday._

Closures are not easy to grasp, but it ain’t impossible. We, as learners, have to understand that, 99% of the time, a concept is always built upon others. We have to figure out how all those dots are connected. Who’s first, who’s next. It’s usually a good approach to trace what you don’t understand _in reverse_. Start with the definition, break it, and repeat it on every small part. And here, we are gonna do this on closures.

## Start From the End

First of all, what is closure? Simply put, closure is a function that has access to free variables. Here how I explain it may be different from how others do it: “A function that has access to variables declared in other functions.” But, truth to be told, you can’t tell where you are gonna go from that, right? It just doesn’t show you the relations between closures and other juicier things. You just can’t dig into it. The trick is to pick the right concepts to learn and use the things they introduce to you to build your road to your goal. And, despite all the unnecessary details, this is already a definition with the minimum amount of knowledge you have to comprehend to understand closures.

OK, cut it. What is a free variable, then? A free variable is a variable that can be used by a function but is not declared in that function scope. And, usually, it is a variable defined in one of the ancestor scopes of the function that uses the variable.

OK. Uhmmm... Ancestor scopes? How do you define a scope tho? For all programming languages, the scope is the range in which a variable can be accessed. And, for JavaScript, the implementation of _scoping_ follows a specific set of rules, which is called “lexical scoping”. We will discuss this later but now we have to first explain how JavaScript code runs.

## Two Phases of How JS Runs

The operation of the JS code is divided into two phases: compilation and execution. The compilation phase handles all variable and function declaration. While the execution phase does things like assigning values to variables, calling functions, and so on.

The compilation here is what they call “just-in-time” compilation or “JIT” for short, which means that the compiler will wait until the code is about to get executed before it does its job. It also means that the compiler will skip the code that will not be executed or unuseful code if you will. The JS compiler will compile the source code into low-level binary machine code before it’s executed. There is no man-in-the-middle code of other forms in the process. Engines like Chrome V8 and Firefox Spidermonkey do this because it makes the engine more efficient.

As I said before, when you run a piece of code like `var bar = 'foo';`, it is divided into two phases.

### First Phase: Compilation

    var bar;

This phase is, as the name suggests, carried out by the compiler. The compiler will go ahead and search in the current scope if there is a declaration with the name **`bar`**. (Look, I know you still don’t understand how scoping works in JavaScript but we will get to that part later in this article. For now, just bear with me for a second.) If it finds such a declaration, the compiler will directly ignore all declarations after the first one; if it is not found, then implement this declaration and create a new variable.

### Second Phase: Execution

```js
bar = 'foo'
```

Time to execute the code. The interpreter (the program that executes the code) will do it. It will first look for the variable `bar` in the current scope. If it finds it, it will assign it the string ‘foo’. If it cannot find it, it will look for it in the parent scope, which is the scope surrounding the current scope.

## How Does JS Scoping Work?

### Lexical Scoping VS Dynamic Scoping

There are two ways to scope in programming languages: Lexical scoping (or static scoping) and dynamic scoping. And JavaScript does it lexically. That is, in JavaScipt, the scope of a variable is determined according to the position of the variable or function declaration in the code and it is carried out only in the compilation phase (rather than the execution phase). A variable’s scope in the lexical scope is the domain where the declaration of it is located, because the determination of the lexical scope only occurs during the compilation phase and there is nothing created other than declarations of variables and functions in that phase. In contrast, scopes in dynamic scoping are the domain where a variable is accessed or a function is executed for reasons similar to why lexical scoping does its things. And both lexical and dynamic scoping decide where parent scopes are the way they decide scopes. Let’s look at an example:

```js
// Lexical scoping
function foo() {
  Object.console.log(bar)
}

function baz() {
  var bar = 'bar'
  foo()
}

baz() // undefined
```

Here, we call the function `baz` which calls the function `foo` which logs the variable `bar`. And here comes the question: where to look for `bar`? That is, where is `foo`’s parent scope? whether look for where `foo` is executed or where it is declared. The answer, in this situation of lexical scoping, is where `foo` is declared. We need to look for `bar` in the global scope. It couldn’t find it. logged `undefined`. While, for dynamic scoping, things are different.

```js
// Dynamic scoping
function foo() {
  console.log(bar)
}

function baz() {
  var bar = 'bar'
  foo()
}

baz() // 'bar'
```

It will look for `bar` inside of function baz where foo gets executed. Found `var bar = 'bar';`, satisfied, logged `'bar'`, and done. Whether when you have a scope chain or just two nested scopes or when you are looking for scopes, parent scopes, just locate the declaration of everything and you’ll get your answer.

Back to what we were talking about moments ago. When a function wants to access a variable, but it can’t find the declaration in itself, you get a free variable.

Here are the rules of how JavaScript looks for free variables:

- When a variable is accessed in a function, the interpreter will first find out whether the variable is declared in the current domain.
- If the variable does not exist in the current scope, then look for the parent scope (the domain where the function declaration is currently located). If you still can’t find it, keep going upward.
- If, at last, the variable declaration is not found in the global scope, throw a `not defined` error.

Now let’s lay out all the scoping rules applied to JavaScript.

- The top-level scope outside of all functions is the global scope, and all the variables declared in it are called “global variables”.
- Variables defined inside a function are in the scope of the function and can only be accessed within the function where the declaration is located. These variables are called “local variables”.
- Two curly braces can create scopes, too. Such a scope is called “block scope”. But it is conditional. In ES5, it only exists when there are curly braces with a `catch` or an object. Some people consider the function scope as block-ish, too. In ES6, the `let` and `const` variable declaration can also form a block scope if they appear in curlies.

So, you see, a function can be a variable’s scope. And, sometimes, a function can be nested in another function. When the former accesses the variables defined in the latter, the former is a closure. Therefore, closures are used to describe the relation between a function and what surrounds it, namely its “lexical environment”. In another word, to form a closure, a function and the reference to its surrounding lexical environment have to be bundled together. But, all the jargon aside, as long as you can grasp how scopes work, closures can be no big deal for you.

## Rare Cases in Interviews

From time to time, rare questions can be asked and you gotta answer them. What’s more irritating is that you probably shouldn’t use the things mentioned in such questions at all. For example, such a piece of code could be thrown at you. And you have to name the value that will get logged.

```js
function showName(str) {
  eval(str)
  console.log(name)
}

var name = 'Peter Wiggin'
var str = 'var name = "Ender Wiggin";'

showName(str)
```

For those of you who don’t know what an `eval` is, it is a built-in function that takes in a string and converts it to runnable code. So the “code” in `str` will be added to line 2 where the `eval` gets called. And we can “translate” the `showName` function above to this.

```js
function showName(str) {
  var name = 'Ender Wiggin'
  console.log(name)
}
```

And guess what? We get “Ender Wiggin” logged. This might save your ass. But remember, DO NOT USE `eval` IN PRODUCTION!!!

Another “evil code” we will look at is `with`. Here is a little crash course on `with`.

```js
var me = {
  name: 'neo42',
  gender: 'male',
  hobbies: ['reading', 'writing'],
}

// Normally, we do things this way
console.log(me.name)
console.log(me.gender)
console.log(me.hobbies)

// But with `with` we can do things like this
with (me) {
  console.log(name)
  console.log(gender)
  console.log(hobbies)
}
```

Now please do not think `with` is just a wacky gimmick that almost no one uses. It is way more dangerous than that. It can bring performance problems and, guess what, it can sort of “hijack” scopes. An example.

```js
function changeId(person) {
  with(person) {
    id = 'Huh?';
  }
}

var me = {
  gender: 'male';
}

changeId(me);
console.log(id); // 'Wuh?'
```

What happened is that when `changeId(me);` gets executed, `with` tries to find `id` in the variable `me` but failed. So without any permission, it creates a global variable `id` and assigns the value `'Wut?'` to it. That is why you will get a global variable by the end of the execution. Of course, JavaScript will not throw an error here in the non-strict mode. Again, you should not use `with` under any circumstances. This article is just a tip for you in case any tricky interview questions pop up.

I hope you ain’t scared away by this last signature dish for you to taste. Try to name all the logs. Tip: write down all accessed variables in each call, and trace them till the end of the execution.

```js
function foo(a, b) {
  console.log(b)
  return {
    foo: function (c) {
      return foo(c, a)
    },
  }
}

var func1 = foo(0) // undefined
func1.foo(1) // 0
func1.foo(2) // 0
func1.foo(3) // 0
var func2 = foo(0).foo(1).foo(2).foo(3) // undefined, 0, 1, 2
var func3 = foo(0).foo(1) // undefined, 0
func3.foo(2) // 1
func3.foo(3) // 1
```

## What We Use Closures for

Enough of how closures work, let’s talk about what closures can be used for. The answer to this question can be various and whether you know it can greatly affect the robustness of your project. Here are some of the most popular use cases.

### Mocking Private Variables & Functions

Closures are about blocking variables’ scope so that we don’t get any unwanted visitors to access them. That is exactly what we want from private variables and functions. So, what is a private variable or function? Say we’re going to create a user login system. And the code is, as you can imagine, brittle and bad.

```js
function User(username, password) {
  this.username = username
  this.password = password
}

User.prototype.login = function () {
  console.log(this.username, this.password)
}

let user = new User('neo42', 'you wish~')
user.login() // neo42, you wish~
console.log(user.username) // neo42
console.log(user.password) // you wish~
```

But Why? You may want to ask. Because people can access a user’s password easily. If your passwords can be seen by others with a line of code, you gotta call someone out. With private variables, things will be different. We can hide the user’s password with a function so that nothing outside the `user` object can get the password, rather than anyone else, like this.

```js
const User = (function () {
  let _password = undefined

  function User(username, password) {
    this.username = username
    _password = password
  }

  User.prototype.login = function () {
    console.log(this.username, _password)
  }

  return User
})()

const user = new User('neo42', 'you wish~')
user.login() // neo42, you wish~
console.log(user.username) // neo42
console.log(user.password) // undefined
```

In this case, `_password` can be used as a private variable of `User`. The underscore \_ before the variable name is just a naming convention for private variables to differ them from normal ones. And, as you see, we wrap the **`User`** function with another function to store the private variables we need. After we create a user using `const user = new User()`, our password gets passed in and stored in `_password`, which is contained in the wrapper function `User`. If we try to access it from the outside, we will fail. Because the wrapper `User` is a closure, which blocks us from getting the variables inside. That’s the magic of closures.

It’s functions, rather than classes, that I wrote the example above with because I wanted to begin the discussion on the topic in the older fashion and then build upon it. Here is how we do it with classes, which is quite similar to that with functions.

```js
const User = (function () {
  let _password = undefined

  class User {
    constructor(username, password) {
      this.username = username
      _password = password
    }

    login() {
      console.log(this.username, _password)
    }
  }

  return User
})()

const user = new User('neo42', 'you wish~')
user.login() // neo42, you wish~
console.log(user.username) // neo42
console.log(user.password) // undefined
```

But still, these ways to create private variables are not native or built-in to JavaScript. Private variables only get added to the specification of ES2019 pretty lately. You can use them like this:

```js
class User {
  #password = undefined
  constructor(username, password) {
    this.username = username
    this.#password = password
  }

  login() {
    console.log(this.username, this.#password)
  }
}

const user = new User('neo42', 'you wish~')
user.login() // neo42, you wish~
console.log(user.username) // neo42
console.log(user.password) // undefined
console.log(user.#password) // Error: Private variable
```

### Curried & Partial Functions Applications

It’s a natural need for academics to describe a certain phenomenon under certain conditions with a weird word. But trust me, people don’t do such things for no reason at all. Because academics are people after all and people are fundamentally lazy. No one would like to do something on purpose if it is not valued. Simply put, people encountered a word, because it is useful, or funny if not.

So what is currying then? Just so you are not upset by the computer science jargon, currying is the process of transforming a function, which takes in multiple arguments, into multiple functions that take in only one argument. People call such converted functions “curried functions”. You do it like this:

```js
// Generic version:
const getFullLocation_ = (
  country,
  province,
  city,
  district
) =>
  `${district}, ${city}, ${province}, ${country}`

console.log(
  getFullLocation_(
    `China`,
    `Beijing`,
    `Beijing`,
    `Haidian`
  )
)
// Haidian, Beijing, Beijing, China

// Curried version:
const getFullLocation =
  (country) =>
  (province) =>
  (city) =>
  (district) =>
    `${district}, ${city}, ${province}, ${country}`

let China = getFullLocation('China') // individual record for China
let BeijingProv = China('Beijing') // for Beijing Province
let Haidian =
  BeijingProv('Beijing')('Haidian') // Haidian
```

But why bother? As you can see, if you use a generic function, you won’t get anything other than the final one-step result. And that can be frustrating in real-world applications. Because, especially in enterprise-scale applications, you’ll want to reuse what you have created as much as possible. That’s what they call “DRY” - “Don’t repeat yourself”. That’s the point of currying. It makes your functions more reusable and more customizable so that they can better compose together.

Like curried functions, partial function applications work similarly. The only difference is that, after the transformation, the number of arguments that each function takes in can be more than one. Like this:

```js
function getLocation(country) {
  return function (province, city) {
    return function (district) {
      return (
        country + province + city + district
      )
    }
  }
}

let Beijing = getLocation('China')(
  'Beijing',
  'Beijing'
) // Beijing
let Haidian = Beijing('Haidian') // Haidian
```

So, in curried & partial functions, the inner functions take in the parameters of the outer functions, which is made possible by the mechanic of the closure. Quite curious, right? Using these concepts takes some time to hone. But it’s definitely worth it.
