import { prisma } from '../config/database.js';

/**
 * Smart Auto-Assignment & Load Balancer for Requests
 * 1. Checks if any active employee specializes in the given ministryId.
 * 2. If found, selects the employee with the lowest number of active (non-completed) requests.
 * 3. If no specialized employee found, selects from all active employees with lowest load.
 */
export async function autoAssignRequestToEmployee(ministryId: string): Promise<string | null> {
  try {
    const activeEmployees = await prisma.user.findMany({
      where: {
        status: 'ACTIVE',
        isAutoAssignEnabled: true,
        role: {
          name: {
            notIn: ['مواطن', 'مراجع']
          }
        }
      },
      include: {
        assignedRequests: {
          where: {
            status: {
              notIn: ['تم التسليم', 'مرفوض', 'ملغي', 'مكتمل']
            }
          },
          select: { id: true }
        }
      }
    });

    if (!activeEmployees || activeEmployees.length === 0) {
      return null;
    }

    // Check employees who have this ministry in their assignedMinistries list
    const specializedEmployees = activeEmployees.filter(
      (emp) => emp.assignedMinistries && emp.assignedMinistries.includes(ministryId)
    );

    const candidates = specializedEmployees.length > 0 ? specializedEmployees : activeEmployees;

    // Sort by number of active requests ascending (least loaded first)
    candidates.sort((a, b) => a.assignedRequests.length - b.assignedRequests.length);

    const selected = candidates[0];
    console.log(`🤖 [AUTO-ASSIGN] Assigned to employee: ${selected.name} (Active load: ${selected.assignedRequests.length})`);
    return selected.id;
  } catch (error) {
    console.warn('⚠️ [AUTO-ASSIGN] Failed to automatically assign employee:', error);
    return null;
  }
}
