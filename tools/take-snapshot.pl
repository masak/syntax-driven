#! /usr/bin/perl
use 5.006;
use strict;
use warnings;

sub say {
    print @_, "\n";
}

my $DIR = "src/";

for my $path (sort <src/*.ts>) {
    my $varname = $path;
    $varname =~ s[^\Q$DIR\E][];
    $varname =~ s[-(.)][uc($1)]ge;
    $varname =~ s[\.ts$][Ts];

    say(qq[export const $varname = `]);

    open(my $FILE, "<", $path)
        or die "Could not open $path: $_";

    LINE:
    while (my $line = <$FILE>) {
        chomp $line;
        if ($line =~ /^\s*$/) {
            say("");
            next LINE;
        }
        $line =~ s[(`|\\)][\\$1]g;
        $line =~ s[\$\{][\\\$\{]g;
        say("    $line");
    }

    say(qq[`;]);
    say("");
}

