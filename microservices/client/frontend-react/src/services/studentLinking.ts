import { Student } from '../types';

const API_BASE_URL = 'http://localhost:4003';

export class StudentLinkingApi {
  /**
   * Lier un compte utilisateur à un étudiant existant basé sur l'email parent
   */
  static async linkByParentEmail(parentEmail: string, userId: string): Promise<{
    success: boolean;
    message: string;
    student: Student;
  }> {
    const response = await fetch(`${API_BASE_URL}/students/link-by-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        parentEmail,
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to link student');
    }

    return response.json();
  }

  /**
   * Lier un compte élève à son propre profil basé sur ses informations personnelles
   */
  static async linkByStudentInfo(
    firstName: string, 
    lastName: string, 
    dateOfBirth: string, 
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    student: Student;
  }> {
    const response = await fetch(`${API_BASE_URL}/students/link-by-student-info`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName,
        lastName,
        dateOfBirth,
        userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to link student profile');
    }

    return response.json();
  }

  /**
   * Rechercher les profils élèves disponibles pour liaison
   */
  static async searchStudentsForLink(
    firstName?: string,
    lastName?: string,
    dateOfBirth?: string
  ): Promise<Array<{
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    program: string;
    session: string;
  }>> {
    const params = new URLSearchParams();
    if (firstName) params.append('firstName', firstName);
    if (lastName) params.append('lastName', lastName);
    if (dateOfBirth) params.append('dateOfBirth', dateOfBirth);

    const response = await fetch(`${API_BASE_URL}/students/search-for-link?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to search students');
    }

    return response.json();
  }

  /**
   * Récupérer les étudiants par email parent pour vérification
   */
  static async getByParentEmail(parentEmail: string): Promise<Student[]> {
    const response = await fetch(`${API_BASE_URL}/students/by-email/${encodeURIComponent(parentEmail)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || 'Failed to fetch students');
    }

    return response.json();
  }

  /**
   * Vérifier si un email parent a des étudiants liables (sans user_id)
   */
  static async checkLinkableStudents(parentEmail: string): Promise<{
    hasLinkableStudents: boolean;
    students: Student[];
  }> {
    try {
      const students = await this.getByParentEmail(parentEmail);
      const linkableStudents = students.filter(student => !student.userId);
      
      return {
        hasLinkableStudents: linkableStudents.length > 0,
        students: linkableStudents
      };
    } catch (error) {
      return {
        hasLinkableStudents: false,
        students: []
      };
    }
  }
}
