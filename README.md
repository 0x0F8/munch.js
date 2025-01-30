munch

Generate a list of words based on an input format.

```
Usage: munch.js
    -h, --help
    -f, --file The output file. Defaults to the working directory.
    -l, --limit Limit the output to a maximum of this many lines.
    -sh, --shuffle In addition to iteration, shuffle the individual tokens provided by the input format.
        For example, "[1]blue[a]" would normally only output 1bluea.
        Shuffle outputs 1bluea, 1ablue, ablue1, etc.
    -a, --alternates Insert common alphanumeric alternates. Will filter out duplicates.
        For example, t is commonly replaced with 7.
        a is commonly replaced with A.
    -m, --format Describes the character set and format of the resulting output file.
        "blue" Insert static word blue into every combination.
        "[red,blue]" Iterate the words red and blue.
        "[0-9]" Iterate one character over 0-9.
        "[a-z]{4}" Iterate 4 characters over a-z.
        "[a-z,A-Z,0-9, ,:]{2}" Iterate 2 characters over a-zA-Z0-9 :.
        "[A-Z]{5,6}" Iterate 5-6 characters over A-Z.
        "[2020-2023]{11,12}" Iterate 11-12 characters over 2020-2023.
        "[%0] Iterate input wordlist, requires -w argument."
        [a-z]{2}[0-9]|[0-9] Iterate [a-z]{2}[0-9] entirely, then 0-9 entirely. | represents an OR operation. Can be infinitely. Shuffle only shuffles tokens within each OR block exclusively.
          Example
            "[0-9]blue[A-Z,a-z]{2,4}[red,blue]"
            First word would be 0blueAAred.
            Last word would be 9bluezzzzblue.
    -z, --gzip Compress output with gzip compression.
    -d, --duplicates Set the maximum times the same character can appear in a row on a single line.
    -s, --stdout Output to stdout instead of file.
    -mi, --min Minimum line length.
    -ma, --max Maximum line length.
    -li, --lps Output processing time based on lines per second.
    -e, --debug Enable debug mode. Outputs debug information. Does not output words.
    -w, --wordlist The input wordlist. Referenced via [%0].
```
