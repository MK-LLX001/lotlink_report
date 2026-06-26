export const Insert_case_support = `
      INSERT INTO support_cases (
        case_number,
        problem_type,
        error_type,
        description,
        status,
        priority,
        assigned_to,
        image_url,
        cust_connect,
        notes,
        created_at,
        updated_at,
        customer
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
