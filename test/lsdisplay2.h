#ifndef __LSDISPLAY_H
#define __LSDISPLAY_H

/*============================================================================
  lsdisplay.h

	C interface declaration for LocSim Display management loadable module.

  Copyright 2007, 2008, 2009 by Gygax Practical Computing, Biel/Bienne, 
  Switzerland
 *===========================================================================*/

/*	TODO: Abfrage der inneren Fenstergrösse
	*/

#ifdef __cplusplus

#include <stdexcept>
#include <string>
#include <sstream>

extern "C" {

#endif

#include "string.h"

#ifdef EXPORT
#undef EXPORT
#endif
#ifdef _WIN32
#ifdef LSDISPLAY_EXPORTS
#define EXPORT __declspec(dllexport)
#else
#define EXPORT __declspec(dllimport)
#endif
#else
#define EXPORT
#endif

// OPENGL SCREENS / WINDOWS --------------------------------------------------

/* OpenGLScreen/Window option flags */

static const int WITH_FRAME = (1 << 0);				// screen/window will have a border
static const int SINGLE_BUFFERED = (1 << 1);		// single-buffered display
static const int FORCE_FRAME = (1 << 2);
static const int DISABLE_COMPOSITION = (1 << 3);	// disable DWM (starting with Vista)

EXPORT int __cdecl lsdspNumberOfScreens(void);

/* Returns 1 if the specified screen is usable, 0 if not. If the screen is usable,
  *x, *y, *w, *h are filled out with the screen's position and dimensions (in
  pixels) */

EXPORT int __cdecl lsdspGetScreenInfo(int screen, int * x, int * y, 
									  unsigned * w, unsigned * h);

/* Opens a full-screen Window for OpenGL rendering, makes it visible, and makes it
	the current rendering context. If you wish to go back to the original context,
	append a call to lsdspRestoreOriginalContext(). */

EXPORT void * __cdecl lsdspOpenGLScreen(int screen, unsigned options);

/* Set rate at which application is producing frames for the specified screen.
 * This will be used by the Desktop Window Manager (DWM) to try and optimize
 * the way frames are composited and sent to the monitor.
 */
EXPORT int __cdecl
lsdspSetSourceRate(void *screen, unsigned num, unsigned denom);

/* Closes the OpenGL full-screen window and makes current the DC and RC that were
  current before the first call to lsdsOpenGLScreen(). If have opened several
  GL screens and want to use one of the remaining ones afterwards, you will have to
  call lsdspSelectGLScreen(). */

EXPORT int __cdecl lsdspCloseGLScreen(void * handle);

/* Equivalent to lsdspCloseGLScreen, provided for grammatical consistency. */

EXPORT int __cdecl lsdspCloseGLWindow(void * handle);

/* Similar to lsdspOpenGLScreen, but opens a "normal" instead of a full-screen
  window. The position is relative to the screen's origin (top-left corner). */

EXPORT void * __cdecl lsdspOpenGLWindow2(unsigned screen, int x, int y, 
	unsigned w, unsigned h, const char * caption);

/*  Returns 1 if the screen or window is ready for use, 0 otherwise (which usually
    means the user has closed the window).
 */
EXPORT int __cdecl lsdspDisplayGood(void *disp);

/**	As the name says....
	*/
EXPORT int __cdecl lsdspGetWindowInnerSize(void *_win, unsigned *width, unsigned *height);

/** Change the title of an open window 
	*/
EXPORT int __cdecl lsdspChangeWindowTitle(void *handle, const char *title);

/** Change the title of an open screen (not displayed on the screen, but still
	useful when flipping between screens using Alt-TAB, etc.)
	*/
EXPORT int __cdecl lsdspChangeScreenTitle(void *handle, const char *title);

/**	Make the specified screen the current OpenGL context.
	*/
EXPORT int __cdecl lsdspSelectGLScreen(void * handle);

/**	Equivalent to lsdspSelectGLScreen, provided for grammatical consistency. 
	*/
EXPORT int __cdecl lsdspSelectGLWindow(void * handle);

/** De-selects any currently selected GL screen, making current (if any) the
	one that was current before the first call to lsdspOpenGLScreen(). */

EXPORT int __cdecl lsdspRestoreOriginalContext();

/* Finishes all OpenGL drawing commands pending in the context of the currently
  selected GL screen, then shows the result by swapping the display buffers.
  Finally, it de-selects the screen as the current rendering context, making
  current again the context that was current before the last call to
  lsdspSelectGLScreen. */

EXPORT int __cdecl lsdspSwapBuffers(void * handle);

EXPORT int __cdecl lsdspSharingContexts(void *disp1, void *disp2);

EXPORT void * __cdecl lsdspCreateExtraContext(void *handle);

EXPORT int __cdecl lsdspSelectExtraContext(void *disp, void *context);

EXPORT int __cdecl lsdspDeleteExtraContext(void *disp, void *context);

// MOUSE AND KEYBOARD --------------------------------------------------------

/** Event types */

#define EVENT_KEYBOARD		1
#define EVENT_MOUSEMOTION	2
#define EVENT_MOUSEBUTTON	3
#define EVENT_QUIT			4

/** Key types */

#define KEYPRESS_DOWN		1
#define KEYPRESS_UP			2

#define KEYTYPE_CHARACTER	1
#define KEYTYPE_VIRTUAL		2

#define METAKEY_SHIFT		0
#define METAKEY_CONTROL		1
#define METAKEY_ALT			2
#define METAKEY_CAPSLOCK	3
#define METAKEY_NUMLOCK		4

/** Mouse buttons */

#define MOUSEBUTTON_LEFT	1
#define MOUSEBUTTON_RIGHT	2
#define MOUSEBUTTON_MIDDLE	3
#define MOUSEBUTTON_WHEEL	4
#define MOUSEBUTTON_X1		5
#define MOUSEBUTTON_X2		6

/** Mouse button directions. */

#define MBUTTONDIR_DOWN		1
#define MBUTTONDIR_UP		2
#define MBUTTONDIR_DBLCLK	3	//* Double-click

/** Bestimmt, ob Koordinaten umgerechnet werden, wobei 0 "keine Konvertierung" bedeutet
	und 1 "Konvertierung eingeschaltet".
	Dabei gibt es zwei Konvertierungen, die getrennt ein- und ausgeschaltet werden können:
	die erste betrifft Koordinaten, die an Anzeigefunktionen wie lsdspDrawTextX() übergeben 
	werden, während die zweite bestimmt, ob von der Maus gelieferte Koordinaten umgerechnet 
	werden.
	Die Bedeutung dieser beiden Konvertierungen ist leicht unterschiedlich. Bei den Anzeige-
	funktionen werde Koordinaten immer relativ zum aktuellen Viewport interpretiert. Die
	Konvertierung - die standardmässig *aktiv* ist - kehrt dabei lediglich die Y-Achse um: 
	bei aktiver Konvertierung weisen positive Y-Koordinaten deshalb aufwärts (in diesem Fall
	liegt der Ursprung am unteren Rand des Viewports), bei deaktivierter Konvertierung abwärts
	(mit dem Ursprung am oberen Rand des Viewports).
	Mit Maus-Koordinaten verhält es sich leicht anders. Ohne Konvertierung - und diese ist
	standardmässig *nicht* aktiv - sind Maus-Koordinaten relativ zur linken oberen Bildschirm-
	Ecke, ohne jegliche Rücksicht auf den Viewport. Die Konvertierung, falls eingeschaltet,
	muss deshalb nicht nur den Viewport berücksichtigen, sondern auch die Ausrichtung der 
	Y-Achse. (Die erste Einstellung hat also Einfluss auf die zweite.)
	Man kann es also so ausdrücken: bei aktivierter Konvertierung der Maus-Koordinaten werden
	diese so konvertiert, dass diese 1:1 dem Koordinaten-System entsprechen, das für die
	Textausgabe verwendet wird.
    Achtung! Die Konvertierung der Maus-Koordinaten funktioniert nur, wenn beim Aufruf von
    lsdspGetMouseEventCoords() der jeweilige Bildschirm oder das jeweilige Fenster angewählt
    ist!
	*/
EXPORT int __cdecl lsdspSelectCoordinateConversions(int coords, int mouse);

/** Returns NULL if no event is waiting. */

EXPORT void * __cdecl lsdspGetNextEvent();

/** Returns the type of an event retrieved by lsdspGetNextEvent(). */

EXPORT int __cdecl lsdspEventType(void * evt);

/** Returns the target (screen or window) of an event. NULL means the event
	is not associated to any specific screen or window. */

EXPORT void * __cdecl lsdspEventTarget(void * evt);

/** Extracts the information from a keyboard event. 
	event	event received through lsdspGetNextEvent()
	type	will receive key type: character or virtual key (KEYTYPE_XXX)
	code	will receive either ANSI/Unicode value of char, or virtual key code
	dir		will receive key direction (KEYPRESS_XXX)
	*/
EXPORT int __cdecl lsdspDecodeKeyEvent(void * evt, int * type, int * code, int * dir);

/** Returns the current states of the meta keys (bitmaks of METAKEY_XXX values).
*/
EXPORT int __cdecl lsdspGetMetaKeyStates();

/** Obtains the mouse coordinates from a mouse motion or mouse button event. 
	*/
EXPORT int __cdecl lsdspGetMouseEventCoords(void *evt, int * x, int * y);

/** Obtains the details of a mouse button action. 
	*/
EXPORT int __cdecl lsdspGetMouseButtonAction(void *_evt, int * button, int * dir);

// TEXT RENDERING  -----------------------------------------------------------

/** Font types: very broad classification. */

#define FONTTYPE_ANY			0
#define FONTTYPE_SYSTEM			1
#define	FONTTYPE_DECORATIVE		2
#define	FONTTYPE_MODERN			3
#define FONTTYPE_ROMAN			4
#define FONTTYPE_SCRIPT			5
#define FONTTYPE_SWISS			6

/** Font attributes: always used as bit fields. */

#define FONTATTRIB_BOLD			0
#define FONTATTRIB_ITALIC		1

#define ALIGN_LEFT		1
#define ALIGN_RIGHT		2
#define ALIGN_CENTER	3

/** Obtain a font for a specified display. You can try to obtain a font through
	its general type (parameter "type", see FONTTYPE_XXX above), or through its
	family name (e.g. "Arial", "Helvetica", etc.). The height is specified in
	pixel; the "attribs" parameter is a bit field based on the FONTATTRIB_XXX
	constants. */

EXPORT void * __cdecl lsdspGetFont(void *disp, int type, const char * family, 
	unsigned height, unsigned attribs);

/** Obtains the extents taken up by a given string when rendered with a 
	given font. 
	The ascent is always positive (or zero), the descent always negative (or zero).
	*/
EXPORT int __cdecl lsdspTextExtentsA(void *font, const char * text, unsigned len,
	int *ascent, int *descent, unsigned * width);

/** Same as lsdspTextExtentsA() but for wide characters.
	*/
EXPORT int __cdecl
lsdspTextExtentsW(void *font, const wchar_t * text, unsigned len, int *ascent, int *descent, 
    unsigned * width);

/** lsdspPrepareFor2D() schaltet den angegebenen Display in den "2D-Modus", in welchem 
	das Koordinatensystem direkt auf das Pixelraster abgebildet wird. In diesem Modus
	ist der Ursprung identisch mit der linken oberen Ecke des Fensterinhalts, und
	positive Y-Koordinaten weisen nach unten.
	Allerdings gilt dies nicht 1:1 für die Funktionen lsdspDrawTextA()/lsdspDrawTextW(),
	bei welchen die Y-Koordinate umgekehrt werden kann, abhängig davon, ob und mit
	welchen Parameter zuvor die Funktion lsdspSelectCoordinateConversions() aufgerufen
	wurde. Standardmässig ist die Umkehrung aktiv, so dass für lsdspDrawTextA() und
	lsdspDrawTextW() Y-Koordinaten ihren Ursprung am unteren Rand haben und positive
	Werte nach oben weisen.
	lsdspDrawText2() hingegen darf nur bei aktivem 2D-Modus aufgerufen werden.
    Der Parameter "disp" kann optional auf NULL belassen werden. In diesem Fall
    wird lediglich die Übeprüfung fallengelassen, ob die Funktion versehentlich
    zum zweiten Mal aufgerufen wurde.
	*/
EXPORT int __cdecl 
lsdspPrepareFor2D(void *disp);

/** Diese Funktion prüft, ob sich der angegebene Display im "2D-Modus" befindet oder
	nicht (0 = nein, 1 = ja).
	*/
EXPORT int __cdecl
lsdspDisplayIn2DMode(void *disp);

/*** Call this when you are done rendering text (or other 2D graphics). */

EXPORT int __cdecl
lsdspDone2D(void *disp);

/** Zeigt ASCII/ANSI-Text an.
	
	Die Koordinaten bezeichnen den Startpunkt, also den linken Beginn des Textes auf dessen
	Basislinie. Man beachte bitte, dass die Koordinaten immer Pixel-Grössen darstellen,
	unabhängig der gerade in OpenGL eingestellten Projektion. Es ist also nicht möglich, den 
	Text zu verzerren oder zu rotieren: dieser wird immer Pixel-optimiert ausgegeben.
	Der eingestellte Viewport hingegen bleibt unangetastet, weshalb die Koordinaten als 
	"Anzahl Pixel" relativ zu dessen linker unterer Ecke interpretiert werden (bzw. linker 
	oberer bei ausgeschalteter Konvertierung, siehe lsdspSelectCoordinateConversions().

	Die "A"-Version ist für 8-bit Text, die W-Version für 16-bit ("wide") Text.

	TODO: length parameter
	*/
EXPORT int __cdecl lsdspDrawTextA(void *disp, void *font, int x, int y, const char *text);

/** Draw Unicode (UTF-16) text. */

EXPORT int __cdecl lsdspDrawTextW(void *disp, void *font, int x, int y, const wchar_t *text);

/** Wie lsdspDrawTextA(), rechnet aber die Y-Koordinate nicht um - diese wird somit immer nach 
	dem Windows-Standard interpretiert (Ursprung oben links, positiv Y = abwärts).
	Ein weiterer Unterschied ist, dass diese Funktion nicht in den 2D-Modus wechselt: der 
	aufrufende Code ist dafür verantwortlich, lsdspPrepareFor2D() und lsdspDone2D() aufzurufen.
	Der Parameter "options" hat im Moment keine Bedeutung, er ist für zukünftige Erweiterungen 
	reserviert.
	*/
EXPORT int __cdecl lsdspDrawText2(void *disp, void *font, int x, int y, const char *text, unsigned options);

/** Save cached font rasterizations. */

EXPORT int __cdecl lsdspSaveFontCache(const char *path);

EXPORT int __cdecl lsdspLoadFontCache(const char *path);

// GRAPHICAL USER INTERFACE --------------------------------------------------

EXPORT int __cdecl lsdspSetControlDisabled(void *ctl, int state);

EXPORT int __cdecl lsdspDeleteControl(void *ctl);

EXPORT int __cdecl lsdspMoveControl(void *ctl, int x, int y);

EXPORT void * __cdecl lsdspCreateButton(void *disp, int x, int y, int w, int h, const char *caption,
	int *click_counter);

EXPORT int __cdecl lsdspRetrieveButtonClicks(void *btn);

EXPORT int __cdecl lsdspSetButtonCaption(void *button, const char *caption);

/*	TODO: data provider...
	*/
EXPORT void * __cdecl lsdspDirectoryListBoxCreate(void *disp, int x, int y, int w, int h,
	const char *folder_path, const char *filters, int *select_accum);

EXPORT int __cdecl lsdspDirectoryListBoxRetrieveCloseCount(void *_dlb);

/**	Returns 1 if a path is selected, 0 if none, and < 0 if an error occurred.
	*/
EXPORT int __cdecl lsdspDirectoryListBoxGetSelectedFilePath(void *lbx, char *buffer, int bsize);

EXPORT int __cdecl lsdspControlSetFocus(void *wid);

EXPORT int __cdecl lsdspRenderUI(void *_disp);

// FRAMEBUFFER OBJECTS

/** Erstellt ein Framebuffer-Objekt der angegebenen Grösse. Nach Ausführung dieser Funktion wirken OpenGL-
	Zeichenbefehle auf das Framebuffer-Objekt anstatt auf den zuvor aktiven OpenGL-Kontext.
	*/
EXPORT int __cdecl lsdspCreateAndSelectFBO(int id, unsigned width, unsigned height, unsigned options = 0);

/** Diese Funktion muss aufgerufen werden, wenn der FBO fertig gezeichnet ist. Der Aufruf richtet die 
	Grafikausgabe wieder auf den zuvor aktiven Kontext und bindet die über den FBO erzeugte Textur, 
	so dass diese sofort zur Texturierung von Primitiven verwendet werden kann.
	*/
EXPORT int __cdecl lsdspDoneFBO(int id);

EXPORT int __cdecl lsdspReactivateFBO(int id);

// PERFORMANCE ANALYSIS ------------------------------------------------------

/* Must be called before any of the following performance analysis functions
  can be used. */

EXPORT int __cdecl lsdspInitPerformanceFunctions();

EXPORT int __cdecl lsdspShutdownPerformanceFunctions();

/* Returns the number of times the current frame must be rendered. */

EXPORT int __cdecl lsdspBeginPerformanceExperiment();

/* Must be called before each rendering pass in performance experiment. 
  Expects the pass number (0-based). */

EXPORT int __cdecl lsdspBeginExperimentPass(int pass_);

/* Call this after each rendering pass during a performance experiment. */

EXPORT int __cdecl lsdspEndExperimentPass(int pass_);

/* Call this after all the rendering passes of a performance experiment
  have been completed. */

EXPORT int __cdecl lsdspEndPerformanceExperiment();

/* Displays the performance HUD. This must be called *after* any experiment-
	related routines above. */

EXPORT int __cdecl lsdspSampleAndRenderStats();

// DEBUGGING -----------------------------------------------------------------

EXPORT int __cdecl
lsdspLogDwmTimingInfo(void *disp, const char *path);

EXPORT int __cdecl lsdspDrawTestBitmap(void *disp, int x, int y);

EXPORT int __cdecl lsdspDebugWrite(const char * line);

EXPORT int __cdecl lsdspRenderDebugOutput();

/** Bestimmt, wie OpenGL-Fehler behandelt werden.
	0 = ignorieren
	1 = an die Debug-Ausgabe schicken (sichtbar im Debugger)
	2 = an das Debug-Fenster schicken (Ausgabe mit lsdspRenderDebugOutput)
	*/
EXPORT int __cdecl 
lsdspOpenGLErrorReporting(int option);

// DESKTOP WINDOW MANAGER TIMING ---------------------------------------------

EXPORT int __cdecl
lsdspRecordDwmTiming(int quantity, const char *path);

// ERROR HANDLING ------------------------------------------------------------

#define LSDSP_NO_ERROR				0
#define LSDSP_UNKNOWN				-1
#define LSDSP_GENERIC				-2
#define LSDSP_RUNTIME_ERROR			-3
#define LSDSP_WINDOWS_API			-10

/* Returns the last error code, clearing it. It also returns extended
  information (if any is available) in the data buffer. */
EXPORT int __cdecl lsdspGetLastError(char * databuf, unsigned bufsize);

/** This converts the error code to a short english text. Note that this is
	a convenience routine: you could map error codes to descriptive text
	yourself, based on the constants defined above. */
EXPORT int __cdecl lsdspGetErrorText(int code, char * textbuf, unsigned bufsize);

EXPORT int __cdecl lsdspDummy();

#ifdef __cplusplus

} // extern "C"

class LSDisplayError: public std::runtime_error {
public:
    static void
    throw_error(const char *ctx = NULL, int code = 0) {
        char errdata[256];
        /* if (code == 0) */
        code = lsdspGetLastError(errdata, 256);
        if (code != 0) {
            char errtxt[128];
            int txsize = lsdspGetErrorText(code, errtxt, 128);
            std::stringstream ss;
            if (ctx != NULL)
                ss << errtxt << " calling " << ctx;
            if (strlen(errdata) > 0) 
                ss << ": " << errdata << std::ends;
            std::string msg = ss.str();
            throw LSDisplayError( msg );
        }
    }

private:
	LSDisplayError(const std::string &msg): std::runtime_error(msg) {}
};

#define LSDSP(func, args) { \
	int code = func args; \
	if (code != 0) LSDisplayError::throw_error(#func, code); \
}

#define LSDSPCHECK(func) { \
	LSDisplayError::throw_error(#func, 0); \
}

#endif // __cplusplus

#undef EXPORT

#endif // __LSDISPLAY_H
