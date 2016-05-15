#!/usr/bin/env sh
                                                                              set +o verbose
# Usage:
# ------
# FIXME: Document this build-script.
#
# Mostly copied from Paws.js and/or mocha-before-this:
#    <https://github.com/ELLIOTTCABLE/Paws.js/blob/6f77f3e1/Scripts/test.sh>
#    <https://github.com/ELLIOTTCABLE/mocha-before-this/blob/e8450e82/test.sh>

puts() { printf %s\\n "$@" ;}
pute() { printf %s\\n "~~ $*" >&2 ;}

# FIXME: This should support *excluded* modules with a minus, as per `node-debug`:
#        https://github.com/visionmedia/debug
if echo "$DEBUG" | grep -qE '(^|,\s*)(\*|mocha-before-this)($|,)'; then
   pute "Script debugging enabled (in: `basename $0`)."
   DEBUG_SCRIPTS=yes
   VERBOSE="${VERBOSE:-7}"
fi

[ -z "${SILENT##[NFnf]*}${QUIET##[NFnf]*}" ] && [ "${VERBOSE:-4}" -gt 6 ] && print_commands=yes

go () { [ -n "$print_commands" ] && puts '`` '"$*" >&2 ; "$@" || exit $? ;}

go babel --source-maps 'inline' --compact 'false' \
   './giraphe.es6.js' > './giraphe.js'
