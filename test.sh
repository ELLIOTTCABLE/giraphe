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

if [ -n "${COVERAGE##[NFnf]*}" ]; then
   [ ! -x "./node_modules/.bin/nyc" ] &&
      pute 'You must `npm install nyc` to use the $COVERAGE flag!' && exit 127

   WATCH='no'
   coverage=yes # Alias so I can stop tying `NFnf` :P
   export NODE_ENV='coverage'

   invocation_guard="nyc"
fi

[ -n "$DEBUG_SCRIPTS" ] && puts \
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
   [ "$coverage" != yes ] && compilers_flag="--compilers js:babel-register"

   go $invocation_guard "./node_modules/.bin/${invocation_guard:+_}mocha"     \
      ${invocation_guard:+ --no-timeouts }                                    \
      $compilers_flag --reporter "$mocha_reporter" --ui "$mocha_ui"           \
      "$@"                                                                    ;}
#     --require mocha-clean/brief                                             \


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

go npm --silent run-script build

mochaify "$unit_dir"/"*.tests.*js" "$@"
