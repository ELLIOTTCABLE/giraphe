#!/usr/bin/env sh
                                                                              set +o verbose
# Usage:
# ------
# FIXME: Document this testing script.
#
# Mostly copied from Paws.js and/or mocha-before-this:
#    <https://github.com/ELLIOTTCABLE/Paws.js/blob/6f77f3e1/Scripts/test.sh>
#    <https://github.com/ELLIOTTCABLE/mocha-before-this/blob/e8450e82/test.sh>

puts() { printf %s\\n "$@" ;}
pute() { printf %s\\n "~~ $*" >&2 ;}
argq() { [ $# -gt 0 ] && printf "'%s' " "$@" ;}

source_dir="$npm_package_directories_src"
unit_dir="$npm_package_directories_test"
coverage_dir="$npm_package_directories_coverage"

mocha_ui="$npm_package_mocha_ui"
mocha_reporter="$npm_package_mocha_reporter"

# FIXME: This should support *excluded* modules with a minus, as per `node-debug`:
#        https://github.com/visionmedia/debug
if echo "$DEBUG" | grep -qE '(^|,\s*)(\*|giraphe(:(scripts|\*))?)($|,)'; then
   pute "Script debugging enabled (in: `basename $0`)."
   DEBUG_SCRIPTS=yes
   VERBOSE="${VERBOSE:-7}"
fi


# Configuration-variable setup
# ----------------------------
[ -z "${SILENT##[NFnf]*}${QUIET##[NFnf]*}" ] && [ "${VERBOSE:-4}" -gt 6 ] && print_commands=yes

if [ -n "${CI##[NFnf]*}" ]; then
   pute "Detected CI environment"

   ci=yes
   DEBUG_SCRIPTS=yes
   DEBUGGER='no'
   WATCH='no'
   export PERMUTATE='yes'

   node_version="$(node --version)"
   case "$node_version" in
      v0.*)
         pute "Node.js $node_version ≤ v4. Not instrumenting for coverage."
         old_node=yes
         COVERAGE='no'                                                        ;;
   esac

   if [ -n "${CI_PREP##[NFnf]*}" ]; then
      if [ -n "$old_node" ]; then
         pute "Old Node: Switching to latest stable version to transpile."

         pute "Old Node: Loading NVM."
         source "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
         nvm use stable
      fi

      pute "Building."
      npm run-script build

      if [ -n "$old_node" ]; then
         pute "Old Node: Returning to Node.js $node_version."
         nvm use "$node_version"
      fi

      if [ -n "${COVERAGE##[NFnf]*}" ]; then
         pute "Installing 'codecov' package."
         npm install 'codecov@^2.2.0'
      fi

      exit 0
   fi
fi

if [ -n "${DEBUGGER##[NFnf]*}" ]; then
   # FIXME: This should require node-debug when the *current version* of Node is old enough
   #[ ! -x "./node_modules/.bin/node-debug" ] && \
   #   pute 'You must `npm install node-inspector` to use the $DEBUGGER flag!' && exit 127

   WATCH='no'
   COVERAGE='no'

   invocation_guard="node --inspect --debug-brk"
fi

if [ -n "${WATCH##[NFnf]*}" ]; then
   [ ! -x "./node_modules/.bin/chokidar" ] &&
      pute 'You must `npm install chokidar-cli` to use the $WATCH flag!' && exit 127
fi

if [ -z "$COVERAGE" ]; then
   if [ -x "./node_modules/.bin/nyc" ]; then
      COVERAGE='yes'
   else
      COVERAGE='no'
   fi
fi

if [ -n "${COVERAGE##[NFnf]*}" ]; then
   [ ! -x "./node_modules/.bin/nyc" ] &&
      pute 'You must `npm install nyc` to use the $COVERAGE flag!' && exit 127

   coverage=yes
   WATCH='no'
   export NODE_ENV='coverage'
   export PERMUTATE='yes'

   if [ -n "$ci" ]; then
      invocation_guard="nyc --show-process-tree --reporter none"
   else
      invocation_guard="nyc --reporter none"
   fi
fi

[ -n "$DEBUG_SCRIPTS" ] && puts \
   "Permutating tests:     ${PERMUTATE:--}"                                   \
   "Running on CI:         ${CI:--}"                                          \
   "Watching filesystem:   ${WATCH:--}"                                       \
   "Running debugger:      ${DEBUGGER:--}"                                    \
   "Generating coverage:   ${COVERAGE:--}"                                    \
   "" \
   "Verbosity:             '$VERBOSE'"                                        \
   "Printing commands:     ${print_commands:--}"                              \
   "" \
   "Tests directory:       '$unit_dir'"                                       \
   "Coverage directory:    '$coverage_dir'"                                   \
   "" >&2

[ -n "$DEBUG_SCRIPTS" ] && [ "${VERBOSE:-4}" -gt 8 ] && \
   pute "Environment variables:" && env >&2


# Helper-function setup
# ---------------------
go () { [ -n "$print_commands" ] && puts '`` '"$*" >&2 ; "$@" || exit $? ;}

mochaify() {
   [ -z "$coverage" ] && compilers_flag="--compilers js:babel-register"

   go $invocation_guard "./node_modules/.bin/${invocation_guard:+_}mocha"     \
      ${invocation_guard:+ --no-timeouts }                                    \
      $compilers_flag --reporter "$mocha_reporter" --ui "$mocha_ui"           \
      "$@"                                                                    ;}


# Execution of tests
# ------------------
if [ -n "${WATCH##[NFnf]*}" ]; then
   [ "${VERBOSE:-4}" -gt 7 ] && chokidar_verbosity='--verbose'

   unset WATCH COVERAGE DEBUGGER
   export VERBOSE

   go exec chokidar \
      "${chokidar_verbosity:---silent}"                                       \
      --initial --ignore '**/.*'                                              \
      "$source_dir" "$unit_dir"                                               \
      $CHOKIDAR_FLAGS -c "$0 $(argq "$@")"
fi

if [ -z "$ci" ]; then
   [ -n "$DEBUG_SCRIPTS" ] && \
      pute "Rebuilding ..."
   go npm --silent run-script build
fi

mochaify "$unit_dir"/"*.tests.*js" "$@"

if [ -n "$coverage" ]; then
   [ -n "$DEBUG_SCRIPTS" ] && \
      pute "Generating coverage reports"

   if [ -n "$ci" ]; then
      nyc report --reporter json
      nyc report --reporter text

      pute "Uploading to https://Codecov.io"
      codecov --disable=gcov -f "$coverage_dir"/coverage-final.json
   else
      nyc report --reporter text-summary | sed '1,2d;$d'
      nyc check-coverage
   fi
fi
