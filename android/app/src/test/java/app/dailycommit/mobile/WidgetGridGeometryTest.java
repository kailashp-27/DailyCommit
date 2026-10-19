package app.dailycommit.mobile;
import static org.junit.Assert.*;
import java.util.HashSet;
import org.junit.Test;
public class WidgetGridGeometryTest {
    @Test public void everyDayFitsWithoutOverlapAtAllWidgetSizes() {
        int[][] sizes = {{118,100},{280,200},{280,500},{700,100}};
        for (int weeks : new int[]{13,26,52}) for (int[] size : sizes) {
            WidgetGridGeometry g = new WidgetGridGeometry(weeks,size[0],size[1]);
            HashSet<String> cells = new HashSet<>();
            for (int day=0;day<weeks*7;day++) {
                assertTrue(g.x(day)>=-.001f); assertTrue(g.y(day)>=-.001f);
                assertTrue(g.x(day)+g.cell<=size[0]+.001f); assertTrue(g.y(day)+g.cell<=size[1]+.001f);
                cells.add(g.x(day)+","+g.y(day));
            }
            assertEquals(weeks*7,cells.size());
        }
    }
    @Test public void squareAndTallYearWidgetsWrapWhileWideWidgetsStayHorizontal() {
        WidgetGridGeometry square = new WidgetGridGeometry(52,280,200), tall = new WidgetGridGeometry(52,280,500), wide = new WidgetGridGeometry(52,700,100);
        assertTrue(square.blocks>1); assertTrue(tall.blocks>square.blocks); assertEquals(1,wide.blocks);
        assertTrue(square.cell>280f/52*.78f);
    }
    @Test public void stripsStayInChronologicalWeekOrder() {
        WidgetGridGeometry g = new WidgetGridGeometry(52,280,200);
        assertEquals(g.x(0),g.x(6),.001f); assertTrue(g.y(6)>g.y(0));
        assertTrue(g.x(7)>g.x(0)); assertEquals(g.y(0),g.y(7),.001f);
        assertEquals(g.x(0),g.x(g.columns*7),.001f); assertTrue(g.y(g.columns*7)>g.y(6));
    }
}
