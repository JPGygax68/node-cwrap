%module lsdisplay2
%{
#include "lsdisplay2.h"
%}
struct Position {
	int x, y;
};

void goTo(const Position *pos);

#define __cdecl

%include "lsdisplay2.h"